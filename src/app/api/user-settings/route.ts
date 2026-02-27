import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const rows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    if (rows.length === 0) {
      // Auto-create the singleton row if it doesn't exist
      const [created] = await db
        .insert(userSettings)
        .values({ id: 1, nickname: "You", mainApiBaseUrl: "https://api.openai.com/v1", mainApiKey: "", mainApiModel: "gpt-4o-mini" })
        .returning();
      saveDb();
      return NextResponse.json(created);
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/user-settings error:", error);
    return NextResponse.json({ error: "Failed to fetch user settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const body = await req.json();
    const { nickname, mainApiBaseUrl, mainApiKey, mainApiModel } = body;

    // Upsert the singleton row (id=1)
    const existing = await db.select().from(userSettings).where(eq(userSettings.id, 1));

    if (existing.length === 0) {
      const [created] = await db
        .insert(userSettings)
        .values({
          id: 1,
          nickname: nickname ?? "You",
          mainApiBaseUrl: mainApiBaseUrl ?? "https://api.openai.com/v1",
          mainApiKey: mainApiKey ?? "",
          mainApiModel: mainApiModel ?? "gpt-4o-mini",
          updatedAt: new Date(),
        })
        .returning();
      saveDb();
      return NextResponse.json(created);
    } else {
      const [updated] = await db
        .update(userSettings)
        .set({
          ...(nickname !== undefined && { nickname }),
          ...(mainApiBaseUrl !== undefined && { mainApiBaseUrl }),
          ...(mainApiKey !== undefined && { mainApiKey }),
          ...(mainApiModel !== undefined && { mainApiModel }),
          updatedAt: new Date(),
        })
        .where(eq(userSettings.id, 1))
        .returning();
      saveDb();
      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error("POST /api/user-settings error:", error);
    return NextResponse.json({ error: "Failed to save user settings" }, { status: 500 });
  }
}
