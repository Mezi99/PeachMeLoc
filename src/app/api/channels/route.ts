import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { channels } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE))));
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(channels);
    const total = countResult[0]?.count || 0;
    
    let all;
    const baseQuery = db.select().from(channels);
    if (includeInactive) {
      all = await baseQuery.orderBy(channels.createdAt).limit(limit).offset(offset);
    } else {
      all = await baseQuery.where(eq(channels.isActive, true)).orderBy(channels.createdAt).limit(limit).offset(offset);
    }
    
    return NextResponse.json({
      data: all,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
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
