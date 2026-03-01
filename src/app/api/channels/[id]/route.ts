import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie, withDbClient } from "@/db";
import { channels, threads, posts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
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
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { id } = await params;
    const body = await req.json();
    const { name, description, emoji, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [channel] = await db
      .update(channels)
      .set(updateData)
      .where(eq(channels.id, parseInt(id)))
      .returning();

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    
    // If setting channel to inactive, also set all threads to inactive
    if (isActive === false) {
      await db
        .update(threads)
        .set({ isActive: false })
        .where(eq(threads.channelId, parseInt(id)));
    }
    // If setting channel to active, also set all threads to active
    if (isActive === true) {
      await db
        .update(threads)
        .set({ isActive: true })
        .where(eq(threads.channelId, parseInt(id)));
    }
    
    saveDb();
    return NextResponse.json(channel);
  } catch (error) {
    console.error("PUT /api/channels/[id] error:", error);
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { id } = await params;
    const channelId = parseInt(id);
    
    // Get all thread IDs for this channel
    const channelThreads = await db.select({ id: threads.id }).from(threads).where(eq(threads.channelId, channelId));
    
    // Delete all posts in these threads
    for (const thread of channelThreads) {
      await db.delete(posts).where(eq(posts.threadId, thread.id));
    }
    
    // Delete all threads in this channel
    await db.delete(threads).where(eq(threads.channelId, channelId));
    
    // Delete the channel
    await db.delete(channels).where(eq(channels.id, channelId));
    
    saveDb();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/channels/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}
