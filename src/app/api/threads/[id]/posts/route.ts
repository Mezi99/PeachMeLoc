import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/db";
import { posts, threads } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const threadPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.threadId, parseInt(id)))
      .orderBy(asc(posts.createdAt));
    return NextResponse.json(threadPosts);
  } catch (error) {
    console.error("GET /api/threads/[id]/posts error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const threadId = parseInt(id);
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // Insert human post
    const [post] = await db
      .insert(posts)
      .values({
        threadId,
        content,
        authorType: "human",
        authorName: "You",
        authorAvatar: "👤",
        agentId: null,
      })
      .returning();

    // Update thread reply count and last activity
    const postsCount = await db.select().from(posts).where(eq(posts.threadId, threadId));
    await db
      .update(threads)
      .set({
        replyCount: postsCount.length - 1,
        lastActivityAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    saveDb();
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("POST /api/threads/[id]/posts error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
