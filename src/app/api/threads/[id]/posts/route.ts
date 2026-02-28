import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { posts, threads, agents, userSettings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

// Extract @mentions from content and return mentioned agent names
function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)]; // Remove duplicates
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
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
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { id } = await params;
    const threadId = parseInt(id);
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // Get user's nickname for authorName
    const userSettingsRows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    const userNickname = userSettingsRows[0]?.nickname?.trim() || "User";

    // Insert human post
    const [post] = await db
      .insert(posts)
      .values({
        threadId,
        content,
        authorType: "human",
        authorName: userNickname,
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
    
    // Extract mentions and resolve to agent IDs
    const mentionedNames = extractMentions(content);
    let mentionedAgentIds: number[] = [];
    
    if (mentionedNames.length > 0) {
      // Look up agents by name (case-sensitive)
      const mentionedAgents = await db
        .select()
        .from(agents)
        .where(eq(agents.isActive, true));
      
      // Match mentioned names to agent names
      mentionedAgentIds = mentionedAgents
        .filter(a => mentionedNames.includes(a.name))
        .map(a => a.id);
    }
    
    return NextResponse.json({ ...post, mentionedAgentIds }, { status: 201 });
  } catch (error) {
    console.error("POST /api/threads/[id]/posts error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
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
    const body = await req.json();
    const { postId, content } = body;

    if (!postId || !content) {
      return NextResponse.json({ error: "postId and content are required" }, { status: 400 });
    }

    // Update the post
    const [updatedPost] = await db
      .update(posts)
      .set({ content })
      .where(eq(posts.id, postId))
      .returning();

    if (!updatedPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    saveDb();
    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("PUT /api/threads/[id]/posts error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
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
    const body = await req.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    // Get the post first to check if it exists
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Delete the post
    await db.delete(posts).where(eq(posts.id, postId));

    // Update thread reply count
    const threadId = parseInt(id);
    const postsCount = await db.select().from(posts).where(eq(posts.threadId, threadId));
    await db
      .update(threads)
      .set({
        replyCount: Math.max(0, postsCount.length - 1),
        lastActivityAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    saveDb();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/threads/[id]/posts error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
