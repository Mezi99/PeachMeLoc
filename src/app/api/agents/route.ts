import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { agents } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const { name, avatar, personaPrompt, llmBaseUrl, llmApiKey, llmModel, contextLimit } = body;

    if (!name || !personaPrompt) {
      return NextResponse.json({ error: "name and personaPrompt are required" }, { status: 400 });
    }

    // Validate name format: no spaces allowed (used as @handle)
    if (/\s/.test(name)) {
      return NextResponse.json({ error: "Agent name cannot contain spaces. Use a single word like 'Alex'." }, { status: 400 });
    }

    if (name.length < 1 || name.length > 30) {
      return NextResponse.json({ error: "Agent name must be 1-30 characters" }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await db.select().from(agents).where(eq(agents.name, name));
    if (existing.length > 0) {
      return NextResponse.json({ error: "An agent with this name already exists. Choose a different name." }, { status: 400 });
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
        contextLimit: contextLimit || 30,
      })
      .returning();

    saveDb();
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("POST /api/agents error:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
