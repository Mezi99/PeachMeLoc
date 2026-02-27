import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/db";
import { directMessages, agents, posts, threads, channels, userSettings } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";

/**
 * Build a shared public forum context block.
 * Fetches the last 40 posts across ALL public threads.
 * All agents see this identically — it represents shared public knowledge.
 */
async function buildPublicForumContext(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  const recentPosts = await db
    .select({
      content: posts.content,
      authorName: posts.authorName,
      threadId: posts.threadId,
      threadTitle: threads.title,
      threadCategory: threads.category,
      channelName: channels.name,
      channelEmoji: channels.emoji,
    })
    .from(posts)
    .innerJoin(threads, eq(posts.threadId, threads.id))
    .leftJoin(channels, eq(threads.channelId, channels.id))
    .orderBy(desc(posts.createdAt))
    .limit(40);

  if (recentPosts.length === 0) {
    return "";
  }

  // Group by thread for readability
  const byThread = new Map<
    number,
    {
      title: string;
      category: string;
      channelLabel: string;
      posts: typeof recentPosts;
    }
  >();
  for (const p of recentPosts) {
    if (!byThread.has(p.threadId)) {
      const channelLabel = p.channelName
        ? `${p.channelEmoji ?? ""} #${p.channelName}`.trim()
        : "General";
      byThread.set(p.threadId, {
        title: p.threadTitle,
        category: p.threadCategory,
        channelLabel,
        posts: [],
      });
    }
    byThread.get(p.threadId)!.posts.push(p);
  }

  const lines: string[] = ["== Public Forum — Recent Activity (shared knowledge) =="];
  for (const [, thread] of byThread) {
    lines.push(`\nThread: "${thread.title}" [${thread.category}] in ${thread.channelLabel}`);
    for (const p of [...thread.posts].reverse()) {
      lines.push(
        `  ${p.authorName}: ${p.content.slice(0, 300)}${p.content.length > 300 ? "…" : ""}`
      );
    }
  }

  return lines.join("\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const db = await getDb();
    const { agentId } = await params;
    const messages = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.agentId, parseInt(agentId)))
      .orderBy(asc(directMessages.createdAt));
    return NextResponse.json(messages);
  } catch (error) {
    console.error("GET /api/dms/[agentId] error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const db = await getDb();
    const { agentId } = await params;
    const agentIdNum = parseInt(agentId);
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // Get agent
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentIdNum));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get main API fallback settings
    const mainApiRows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    const mainApi = mainApiRows[0] ?? {
      mainApiBaseUrl: "https://api.openai.com/v1",
      mainApiKey: "",
      mainApiModel: "gpt-4o-mini",
    };

    // Resolve effective LLM config (agent-specific or fallback to Main API)
    const effectiveBaseUrl = agent.llmApiKey.trim() ? agent.llmBaseUrl : mainApi.mainApiBaseUrl;
    const effectiveApiKey = agent.llmApiKey.trim() ? agent.llmApiKey : mainApi.mainApiKey;
    const effectiveModel = agent.llmApiKey.trim() ? agent.llmModel : mainApi.mainApiModel;

    // Save human message first
    const [humanMsg] = await db
      .insert(directMessages)
      .values({
        agentId: agentIdNum,
        role: "human",
        content,
      })
      .returning();

    // Get this agent's full DM history (including the message we just saved)
    const history = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.agentId, agentIdNum))
      .orderBy(asc(directMessages.createdAt));

    // Build shared public forum context (same for all agents — public knowledge)
    const publicContext = await buildPublicForumContext(db);

    // Compose system prompt with layered context
    const contextBlock = publicContext
      ? `\n\n${publicContext}\n\n== End of Public Context ==`
      : "";

    const systemPrompt = `You are ${agent.name}, a member of the PeachMe forum, having a private direct message conversation with the user.

Your persona:
${agent.personaPrompt}${contextBlock}

Important rules:
- Stay in character as ${agent.name} at all times
- You have memory of all public forum threads above — you can reference them naturally in conversation
- This is a PRIVATE 1-on-1 DM — be more personal, direct, and intimate than in public forum posts
- Your relationship with this user is shaped by your DM history below — honor it
- Do NOT reveal or reference other agents' private DMs (you don't know about them)
- Keep responses conversational and natural
- Do NOT prefix your message with your name or any label`;

    // Build LLM message list from DM history
    // All messages before the last one are history; the last one is the current user message
    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(0, -1).map((m) => ({
        role: m.role === "human" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content },
    ];

    // Call LLM using effective (agent-specific or fallback) config
    let agentContent = "(no response)";
    try {
      const url = effectiveBaseUrl.endsWith("/")
        ? effectiveBaseUrl + "chat/completions"
        : effectiveBaseUrl + "/chat/completions";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveApiKey}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: llmMessages,
          max_tokens: 1024,
          temperature: 0.85,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        agentContent = data.choices?.[0]?.message?.content ?? "(no response)";
      } else {
        const errText = await response.text();
        agentContent = `[Error: ${response.status} — ${errText.slice(0, 200)}]`;
      }
    } catch (llmErr) {
      console.error("LLM error in DM:", llmErr);
      agentContent = "[Error: Could not reach LLM. Check agent settings.]";
    }

    // Save agent reply
    const [agentMsg] = await db
      .insert(directMessages)
      .values({
        agentId: agentIdNum,
        role: "agent",
        content: agentContent,
      })
      .returning();

    saveDb();
    return NextResponse.json({ humanMessage: humanMsg, agentMessage: agentMsg }, { status: 201 });
  } catch (error) {
    console.error("POST /api/dms/[agentId] error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
