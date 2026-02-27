import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const all = await db.select().from(channels).orderBy(channels.createdAt);
    return NextResponse.json(all);
  } catch (error) {
    console.error("GET /api/channels error:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const body = await req.json();
    const { name, description, emoji } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    // Check uniqueness
    const existing = await db.select().from(channels).where(eq(channels.slug, slug));
    if (existing.length > 0) {
      return NextResponse.json({ error: "A channel with this name already exists" }, { status: 409 });
    }

    const [channel] = await db
      .insert(channels)
      .values({
        name,
        slug,
        description: description || "",
        emoji: emoji || "💬",
      })
      .returning();

    saveDb();
    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error("POST /api/channels error:", error);
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}
