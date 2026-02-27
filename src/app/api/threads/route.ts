import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { threads, posts } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allThreads = await db.select().from(threads).orderBy(desc(threads.lastActivityAt));
    return NextResponse.json(allThreads);
  } catch (error) {
    console.error("GET /api/threads error:", error);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    const [thread] = await db
      .insert(threads)
      .values({
        title,
        category: category || "General",
        authorName: "You",
        replyCount: 0,
      })
      .returning();

    // Create the first post (the OP)
    await db.insert(posts).values({
      threadId: thread.id,
      content,
      authorType: "human",
      authorName: "You",
      authorAvatar: "👤",
      agentId: null,
    });

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("POST /api/threads error:", error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
