import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie, withDbClient } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Default "Important rules" for public forum threads
const DEFAULT_PUBLIC_RULES = `Stay in character as {agentName} at all times
- You have memory of all public forum threads above — you can reference them naturally
- Your private DM history with the user is personal — you may let it subtly influence your tone and relationship, but don't quote DMs verbatim in public
- Write naturally as a forum member — conversational, opinionated, engaging
- Keep responses focused and reasonably concise (2-4 paragraphs max)
- React to what others have said in this thread
- You CAN mention other agents by using @username to get their attention
- Do NOT prefix your message with your name or any label
- Do NOT use markdown headers, just plain conversational text`;

// Default "Important rules" for DM conversations
const DEFAULT_DM_RULES = `Stay in character as {agentName} at all times
- You have memory of all public forum threads above — you can reference them naturally in conversation
- This is a PRIVATE 1-on-1 DM — be more personal, direct, and intimate than in public forum posts
- Your relationship with this user is shaped by your DM history below — honor it
- Do NOT reveal or reference other agents' private DMs (you don't know about them)
- Keep responses conversational and natural
- Do NOT prefix your message with your name or any label`;

// Ensure important_rules columns exist (run migration if needed)
async function ensureImportantRulesColumns() {
  try {
    await withDbClient((client) => {
      const result = client.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[];
      const hasPublicRules = result.some((col) => col.name === "public_important_rules");
      const hasDmRules = result.some((col) => col.name === "dm_important_rules");
      const hasPrototypePublic = result.some((col) => col.name === "prototype_public_rules");
      const hasPrototypeDm = result.some((col) => col.name === "prototype_dm_rules");
      
      if (!hasPublicRules) {
        console.log("Adding public_important_rules column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN public_important_rules TEXT;");
      }
      if (!hasDmRules) {
        console.log("Adding dm_important_rules column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN dm_important_rules TEXT;");
      }
      if (!hasPrototypePublic) {
        console.log("Adding prototype_public_rules column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN prototype_public_rules TEXT;");
      }
      if (!hasPrototypeDm) {
        console.log("Adding prototype_dm_rules column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN prototype_dm_rules TEXT;");
      }
    });
  } catch (e) {
    console.error("Migration error:", e);
  }
}

export async function GET() {
  try {
    await syncForumFromCookie();
    await ensureImportantRulesColumns();
    
    const db = getDb();
    const rows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    
    if (rows.length === 0) {
      // Create default settings if not exists
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
      return NextResponse.json({ 
        publicImportantRules: DEFAULT_PUBLIC_RULES, 
        dmImportantRules: DEFAULT_DM_RULES,
        prototypePublicRules: DEFAULT_PUBLIC_RULES,
        prototypeDmRules: DEFAULT_DM_RULES,
      });
    }
    
    const settings = rows[0];
    // Return stored rules or prototypes (or defaults if neither)
    const publicImportantRules = settings.publicImportantRules ?? settings.prototypePublicRules ?? DEFAULT_PUBLIC_RULES;
    const dmImportantRules = settings.dmImportantRules ?? settings.prototypeDmRules ?? DEFAULT_DM_RULES;
    const prototypePublicRules = settings.prototypePublicRules ?? DEFAULT_PUBLIC_RULES;
    const prototypeDmRules = settings.prototypeDmRules ?? DEFAULT_DM_RULES;
    
    return NextResponse.json({ 
      publicImportantRules, 
      dmImportantRules,
      prototypePublicRules,
      prototypeDmRules,
    });
  } catch (error) {
    console.error("GET /api/system-prompt error:", error);
    return NextResponse.json({ error: "Failed to fetch important rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await syncForumFromCookie();
    await ensureImportantRulesColumns();
    
    const db = getDb();
    const body = await req.json();
    const { publicImportantRules, dmImportantRules, resetPublicToPrototype, resetDmToPrototype } = body;
    
    const existing = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    
    if (existing.length === 0) {
      // Create with default values
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
          publicImportantRules: resetPublicToPrototype ? null : (publicImportantRules ?? DEFAULT_PUBLIC_RULES),
          dmImportantRules: resetDmToPrototype ? null : (dmImportantRules ?? DEFAULT_DM_RULES),
          updatedAt: new Date(),
        })
        .returning();
      saveDb();
      return NextResponse.json({ 
        publicImportantRules: resetPublicToPrototype ? DEFAULT_PUBLIC_RULES : (publicImportantRules ?? DEFAULT_PUBLIC_RULES),
        dmImportantRules: resetDmToPrototype ? DEFAULT_DM_RULES : (dmImportantRules ?? DEFAULT_DM_RULES),
        prototypePublicRules: DEFAULT_PUBLIC_RULES,
        prototypeDmRules: DEFAULT_DM_RULES,
      });
    } else {
      // Update existing settings
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      
      if (resetPublicToPrototype) {
        updateData.publicImportantRules = null;
      } else if (publicImportantRules !== undefined) {
        updateData.publicImportantRules = publicImportantRules;
      }
      
      if (resetDmToPrototype) {
        updateData.dmImportantRules = null;
      } else if (dmImportantRules !== undefined) {
        updateData.dmImportantRules = dmImportantRules;
      }
      
      const [updated] = await db
        .update(userSettings)
        .set(updateData)
        .where(eq(userSettings.id, 1))
        .returning();
      saveDb();
      
      // Return the current effective rules
      const effectivePublicRules = updated.publicImportantRules ?? updated.prototypePublicRules ?? DEFAULT_PUBLIC_RULES;
      const effectiveDmRules = updated.dmImportantRules ?? updated.prototypeDmRules ?? DEFAULT_DM_RULES;
      
      return NextResponse.json({ 
        publicImportantRules: effectivePublicRules, 
        dmImportantRules: effectiveDmRules,
        prototypePublicRules: updated.prototypePublicRules ?? DEFAULT_PUBLIC_RULES,
        prototypeDmRules: updated.prototypeDmRules ?? DEFAULT_DM_RULES,
      });
    }
  } catch (error) {
    console.error("POST /api/system-prompt error:", error);
    return NextResponse.json({ error: "Failed to save important rules" }, { status: 500 });
  }
}
