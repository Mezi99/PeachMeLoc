import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const [channel] = await db.select().from(channels).where(eq(channels.id, parseInt(id)));
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    return NextResponse.json(channel);
  } catch (error) {
    console.error("GET /api/channels/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch channel" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const body = await req.json();
    const { name, description, emoji } = body;

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (emoji !== undefined) updateData.emoji = emoji;

    const [channel] = await db
      .update(channels)
      .set(updateData)
      .where(eq(channels.id, parseInt(id)))
      .returning();

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    
    saveDb();
    return NextResponse.json(channel);
  } catch (error) {
    console.error("PUT /api/channels/[id] error:", error);
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    await db.delete(channels).where(eq(channels.id, parseInt(id)));
    saveDb();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/channels/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}
