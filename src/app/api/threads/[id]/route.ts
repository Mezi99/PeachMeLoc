import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { threads, posts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie();
    const db = getDb();
    const { id } = await params;
    const threadId = parseInt(id);
    
    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId));
    
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    return NextResponse.json(thread);
  } catch (error) {
    console.error("GET /api/threads/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie();
    const db = getDb();
    const { id } = await params;
    const threadId = parseInt(id);
    const body = await req.json();
    
    // Check if thread exists
    const [existing] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId));
    
    if (!existing) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    // Handle isActive toggle
    if (typeof body.isActive === "boolean") {
      const [updated] = await db
        .update(threads)
        .set({ isActive: body.isActive })
        .where(eq(threads.id, threadId))
        .returning();
      
      saveDb();
      return NextResponse.json(updated);
    }
    
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/threads/[id] error:", error);
    return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie();
    const db = getDb();
    const { id } = await params;
    const threadId = parseInt(id);
    
    // Check if thread exists
    const [existing] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId));
    
    if (!existing) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    
    // Delete all posts in the thread first
    await db.delete(posts).where(eq(posts.threadId, threadId));
    
    // Delete the thread
    await db.delete(threads).where(eq(threads.id, threadId));
    
    saveDb();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/threads/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
  }
}
