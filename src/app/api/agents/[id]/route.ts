import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { agents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { id } = await params;
    const [agent] = await db.select().from(agents).where(eq(agents.id, parseInt(id)));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (error) {
    console.error("GET /api/agents/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { id } = await params;
    const body = await req.json();
    const { name, avatar, personaPrompt, llmBaseUrl, llmApiKey, llmModel, isActive, contextLimit } = body;

    // Validate name format if provided
    if (name !== undefined) {
      if (/\s/.test(name)) {
        return NextResponse.json({ error: "Agent name cannot contain spaces. Use a single word like 'Alex'." }, { status: 400 });
      }
      if (name.length < 1 || name.length > 30) {
        return NextResponse.json({ error: "Agent name must be 1-30 characters" }, { status: 400 });
      }

      // Check for duplicate name (excluding current agent)
      const existing = await db.select().from(agents).where(eq(agents.name, name));
      if (existing.length > 0 && existing[0].id !== parseInt(id)) {
        return NextResponse.json({ error: "An agent with this name already exists. Choose a different name." }, { status: 400 });
      }
    }

    const [agent] = await db
      .update(agents)
      .set({
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(personaPrompt !== undefined && { personaPrompt }),
        ...(llmBaseUrl !== undefined && { llmBaseUrl }),
        ...(llmApiKey !== undefined && { llmApiKey }),
        ...(llmModel !== undefined && { llmModel }),
        ...(isActive !== undefined && { isActive }),
        ...(contextLimit !== undefined && { contextLimit }),
      })
      .where(eq(agents.id, parseInt(id)))
      .returning();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    
    saveDb();
    return NextResponse.json(agent);
  } catch (error) {
    console.error("PUT /api/agents/[id] error:", error);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { id } = await params;
    await db.delete(agents).where(eq(agents.id, parseInt(id)));
    saveDb();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/agents/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
