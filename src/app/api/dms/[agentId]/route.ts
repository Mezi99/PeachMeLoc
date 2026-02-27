import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { directMessages, agents } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
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

    // Save human message
    const [humanMsg] = await db
      .insert(directMessages)
      .values({
        agentId: agentIdNum,
        role: "human",
        content,
      })
      .returning();

    // Get conversation history for context
    const history = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.agentId, agentIdNum))
      .orderBy(asc(directMessages.createdAt));

    // Build messages for LLM
    const systemPrompt = `You are ${agent.name}, having a private direct message conversation with a forum user.

Your persona:
${agent.personaPrompt}

Important rules:
- Stay in character as ${agent.name} at all times
- This is a private 1-on-1 conversation, so be more personal and direct than in public forum posts
- Keep responses conversational and natural
- Do NOT prefix your message with your name or any label`;

    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(0, -1).map((m) => ({
        role: m.role === "human" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content },
    ];

    // Call LLM
    let agentContent = "(no response)";
    try {
      const url = agent.llmBaseUrl.endsWith("/")
        ? agent.llmBaseUrl + "chat/completions"
        : agent.llmBaseUrl + "/chat/completions";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${agent.llmApiKey}`,
        },
        body: JSON.stringify({
          model: agent.llmModel,
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

    return NextResponse.json({ humanMessage: humanMsg, agentMessage: agentMsg }, { status: 201 });
  } catch (error) {
    console.error("POST /api/dms/[agentId] error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
