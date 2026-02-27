import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie, withDbClient } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Ensure hop_counter column exists (run migration if needed)
async function ensureHopCounterColumn() {
  try {
    await withDbClient((client) => {
      // Check if column exists
      const result = client.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[];
      const hasHopCounter = result.some((col) => col.name === "hop_counter");
      if (!hasHopCounter) {
        console.log("Adding hop_counter column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN hop_counter INTEGER NOT NULL DEFAULT 2;");
      }
    });
  } catch (e) {
    console.error("Migration error:", e);
  }
}

// Default "Important rules" for public forum threads
const DEFAULT_PUBLIC_RULES = `- Stay in character as {agentName} at all times
- You have memory of all public forum threads above — you can reference them naturally
- Your private DM history with the user is personal — you may let it subtly influence your tone and relationship, but don't quote DMs verbatim in public
- Write naturally as a forum member — conversational, opinionated, engaging
- Keep responses focused and reasonably concise (2-4 paragraphs max)
- React to what others have said in this thread
- You CAN mention other agents by using @username to get their attention
- Do NOT prefix your message with your name or any label
- Do NOT use markdown headers, just plain conversational text`;

// Default "Important rules" for DM conversations
const DEFAULT_DM_RULES = `- Stay in character as {agentName} at all times
- You have memory of all public forum threads above — you can reference them naturally in conversation
- This is a PRIVATE 1-on-1 DM — be more personal, direct, and intimate than in public forum posts
- Your relationship with this user is shaped by your DM history below — honor it
- Do NOT reveal or reference other agents' private DMs (you don't know about them)
- Keep responses conversational and natural
- Do NOT prefix your message with your name or any label`;

// Ensure system_prompt columns exist (run migration if needed)
async function ensureSystemPromptColumns() {
  try {
    await withDbClient((client) => {
      const result = client.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[];
      const hasPublicRules = result.some((col) => col.name === "public_important_rules");
      const hasDmRules = result.some((col) => col.name === "dm_important_rules");
      
      if (!hasPublicRules) {
        console.log("Adding public_important_rules column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN public_important_rules TEXT;");
      }
      if (!hasDmRules) {
        console.log("Adding dm_important_rules column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN dm_important_rules TEXT;");
      }
    });
  } catch (e) {
    console.error("Migration error:", e);
  }
}

export async function GET() {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    await ensureHopCounterColumn(); // Ensure column exists
    await ensureSystemPromptColumns(); // Ensure columns exist
    const db = getDb();
    const rows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    if (rows.length === 0) {
      // Auto-create the singleton row if it doesn't exist
      const [created] = await db
        .insert(userSettings)
        .values({ 
          id: 1, 
          nickname: "You", 
          mainApiBaseUrl: "https://api.openai.com/v1", 
          mainApiKey: "", 
          mainApiModel: "gpt-4o-mini", 
          hopCounter: 2,
          prototypePublicRules: DEFAULT_PUBLIC_RULES,
          prototypeDmRules: DEFAULT_DM_RULES,
        })
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
    await ensureHopCounterColumn(); // Ensure column exists
    await ensureSystemPromptColumns(); // Ensure columns exist
    const db = getDb();
    const body = await req.json();
    const { nickname, mainApiBaseUrl, mainApiKey, mainApiModel, hopCounter } = body;

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
          hopCounter: hopCounter ?? 2,
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
          ...(hopCounter !== undefined && { hopCounter }),
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
