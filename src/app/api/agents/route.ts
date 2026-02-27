import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { agents } from "@/db/schema";

export async function GET() {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const allAgents = await db.select().from(agents).orderBy(agents.createdAt);
    return NextResponse.json(allAgents);
  } catch (error) {
    console.error("GET /api/agents error:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const body = await req.json();
    const { name, avatar, personaPrompt, llmBaseUrl, llmApiKey, llmModel } = body;

    if (!name || !personaPrompt) {
      return NextResponse.json({ error: "name and personaPrompt are required" }, { status: 400 });
    }

    const [agent] = await db
      .insert(agents)
      .values({
        name,
        avatar: avatar || "🤖",
        personaPrompt,
        llmBaseUrl: llmBaseUrl || "https://api.openai.com/v1",
        llmApiKey: llmApiKey || "",
        llmModel: llmModel || "gpt-4o-mini",
        isActive: true,
      })
      .returning();

    saveDb();
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("POST /api/agents error:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
