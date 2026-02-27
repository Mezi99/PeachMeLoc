import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, threads, agents } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

async function callLLM(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "(no response)";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const threadId = parseInt(id);

    // Get thread info
    const [thread] = await db.select().from(threads).where(eq(threads.id, threadId));
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get all active agents
    const activeAgents = await db.select().from(agents).where(eq(agents.isActive, true));
    if (activeAgents.length === 0) {
      return NextResponse.json({ error: "No active agents found" }, { status: 400 });
    }

    // Get existing posts for context
    const existingPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.threadId, threadId))
      .orderBy(asc(posts.createdAt));

    const newAgentPosts = [];

    // Each active agent responds
    for (const agent of activeAgents) {
      // Build conversation history for this agent
      const conversationHistory = existingPosts.map((p) => ({
        role: p.authorType === "human" ? "user" : "assistant",
        content: `[${p.authorName}]: ${p.content}`,
      }));

      const systemPrompt = `You are ${agent.name}, a forum member with the following persona:

${agent.personaPrompt}

You are participating in a forum thread titled: "${thread.title}" in the "${thread.category}" category.

Important rules:
- Stay in character as ${agent.name} at all times
- Write naturally as a forum member would — conversational, opinionated, engaging
- Keep responses focused and reasonably concise (2-4 paragraphs max)
- React to what others have said in the thread
- Do NOT prefix your message with your name or any label
- Do NOT use markdown headers, just plain conversational text`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        {
          role: "user",
          content: `Please respond to this forum thread as ${agent.name}.`,
        },
      ];

      try {
        const content = await callLLM(
          agent.llmBaseUrl,
          agent.llmApiKey,
          agent.llmModel,
          messages
        );

        const [agentPost] = await db
          .insert(posts)
          .values({
            threadId,
            content,
            authorType: "agent",
            authorName: agent.name,
            authorAvatar: agent.avatar,
            agentId: agent.id,
          })
          .returning();

        newAgentPosts.push(agentPost);
      } catch (llmError) {
        console.error(`LLM error for agent ${agent.name}:`, llmError);
        // Insert error post so user knows something went wrong
        const [errorPost] = await db
          .insert(posts)
          .values({
            threadId,
            content: `[Error: Could not generate response. Check API key and model settings for this agent.]`,
            authorType: "agent",
            authorName: agent.name,
            authorAvatar: agent.avatar,
            agentId: agent.id,
          })
          .returning();
        newAgentPosts.push(errorPost);
      }
    }

    // Update thread reply count and last activity
    const allPosts = await db.select().from(posts).where(eq(posts.threadId, threadId));
    await db
      .update(threads)
      .set({
        replyCount: allPosts.length - 1,
        lastActivityAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    return NextResponse.json({ posts: newAgentPosts });
  } catch (error) {
    console.error("POST /api/threads/[id]/generate error:", error);
    return NextResponse.json({ error: "Failed to generate responses" }, { status: 500 });
  }
}
