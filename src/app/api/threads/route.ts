import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { threads, posts, userSettings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (channelId) {
      const allThreads = await db
        .select()
        .from(threads)
        .where(eq(threads.channelId, parseInt(channelId)))
        .orderBy(desc(threads.lastActivityAt));
      return NextResponse.json(allThreads);
    }

    const allThreads = await db.select().from(threads).orderBy(desc(threads.lastActivityAt));
    return NextResponse.json(allThreads);
  } catch (error) {
    console.error("GET /api/threads error:", error);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const body = await req.json();
    const { title, category, content, channelId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    // Get user's nickname for authorName
    const userSettingsRows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    const userNickname = userSettingsRows[0]?.nickname?.trim() || "User";

    const [thread] = await db
      .insert(threads)
      .values({
        title,
        category: category || "General",
        channelId: channelId ? parseInt(channelId) : null,
        authorName: userNickname,
        replyCount: 0,
      })
      .returning();

    // Create the first post (the OP)
    await db.insert(posts).values({
      threadId: thread.id,
      content,
      authorType: "human",
      authorName: userNickname,
      authorAvatar: "👤",
      agentId: null,
    });

    saveDb();
    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("POST /api/threads error:", error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
