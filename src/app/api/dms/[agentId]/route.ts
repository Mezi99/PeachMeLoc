import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie, withDbClient } from "@/db";
import { directMessages, agents, posts, threads, channels, userSettings } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";

// Ensure important_rules columns exist (run migration if needed)
async function ensureImportantRulesColumns() {
  try {
    await withDbClient((client) => {
      const result = client.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[];
      const hasPublicRules = result.some((col) => col.name === "public_important_rules");
      const hasDmRules = result.some((col) => col.name === "dm_important_rules");
      const hasPublicPostInstruction = result.some((col) => col.name === "public_post_instruction");
      const hasDmPostInstruction = result.some((col) => col.name === "dm_post_instruction");
      const hasPrototypePublicPost = result.some((col) => col.name === "prototype_public_post_instruction");
      const hasPrototypeDmPost = result.some((col) => col.name === "prototype_dm_post_instruction");
      
      if (!hasPublicRules) {
        console.log("Adding public_important_rules column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN public_important_rules TEXT;");
      }
      if (!hasDmRules) {
        console.log("Adding dm_important_rules column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN dm_important_rules TEXT;");
      }
      if (!hasPublicPostInstruction) {
        console.log("Adding public_post_instruction column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN public_post_instruction TEXT;");
      }
      if (!hasDmPostInstruction) {
        console.log("Adding dm_post_instruction column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN dm_post_instruction TEXT;");
      }
      if (!hasPrototypePublicPost) {
        console.log("Adding prototype_public_post_instruction column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN prototype_public_post_instruction TEXT;");
      }
      if (!hasPrototypeDmPost) {
        console.log("Adding prototype_dm_post_instruction column to user_settings...");
        client.exec("ALTER TABLE user_settings ADD COLUMN prototype_dm_post_instruction TEXT;");
      }
    });
  } catch (e) {
    console.error("Migration error:", e);
  }
}

// Ensure context_limit column exists in agents table (run migration if needed)
async function ensureContextLimitColumn() {
  try {
    await withDbClient((client) => {
      const result = client.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
      const hasContextLimit = result.some((col) => col.name === "context_limit");
      if (!hasContextLimit) {
        console.log("Adding context_limit column to agents...");
        client.exec("ALTER TABLE agents ADD COLUMN context_limit INTEGER NOT NULL DEFAULT 30;");
      }
    });
  } catch (e) {
    console.error("Migration error:", e);
  }
}

/**
 * Build a shared public forum context block.
 * Fetches the last N posts across ALL public threads.
 * All agents see this identically — it represents shared public knowledge.
 */
async function buildPublicForumContext(db: Awaited<ReturnType<typeof getDb>>, limit: number = 40): Promise<string> {
  const recentPosts = await db
    .select({
      content: posts.content,
      authorName: posts.authorName,
      threadId: posts.threadId,
      threadTitle: threads.title,
      threadCategory: threads.category,
      channelName: channels.name,
      channelEmoji: channels.emoji,
    })
    .from(posts)
    .innerJoin(threads, eq(posts.threadId, threads.id))
    .leftJoin(channels, eq(threads.channelId, channels.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  if (recentPosts.length === 0) {
    return "";
  }

  // Group by thread for readability
  const byThread = new Map<
    number,
    {
      title: string;
      category: string;
      channelLabel: string;
      posts: typeof recentPosts;
    }
  >();
  for (const p of recentPosts) {
    if (!byThread.has(p.threadId)) {
      const channelLabel = p.channelName
        ? `${p.channelEmoji ?? ""} #${p.channelName}`.trim()
        : "General";
      byThread.set(p.threadId, {
        title: p.threadTitle,
        category: p.threadCategory,
        channelLabel,
        posts: [],
      });
    }
    byThread.get(p.threadId)!.posts.push(p);
  }

  const lines: string[] = ["== Public Forum — Recent Activity (shared knowledge) =="];
  for (const [, thread] of byThread) {
    lines.push(`\nThread: "${thread.title}" [${thread.category}] in ${thread.channelLabel}`);
    for (const p of [...thread.posts].reverse()) {
      lines.push(
        `  ${p.authorName}: ${p.content.slice(0, 300)}${p.content.length > 300 ? "…" : ""}`
      );
    }
  }

  return lines.join("\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    const db = getDb();
    const { agentId } = await params;
    const messages = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.agentId, parseInt(agentId)))
      .orderBy(asc(directMessages.createdAt));
    return NextResponse.json(messages);
  } catch (error) {
    console.error("GET /api/dms/[agentId] error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    await ensureImportantRulesColumns(); // Ensure columns exist
    await ensureContextLimitColumn(); // Ensure context_limit column exists in agents table
    const db = getDb();
    const { agentId } = await params;
    const agentIdNum = parseInt(agentId);
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // Get agent
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentIdNum));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get main API fallback settings
    const mainApiRows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    const mainApi = mainApiRows[0] ?? {
      mainApiBaseUrl: "https://api.openai.com/v1",
      mainApiKey: "",
      mainApiModel: "gpt-4o-mini",
      nickname: "User",
    };
    const userNickname = mainApi.nickname?.trim() || "User";
    
    // Get stored DM important rules
    const storedDmRules = mainApi.dmImportantRules ?? mainApi.prototypeDmRules ?? null;
    
    // Get stored DM post-instruction (or use default)
    const storedDmPostInstruction = (mainApi as Record<string, unknown>).dmPostInstruction as string | null 
      ?? (mainApi as Record<string, unknown>).prototypeDmPostInstruction as string | null 
      ?? null;
    
    // Default "Important rules" for DM conversations
    const DEFAULT_DM_RULES = `- Stay in character as {agentName} at all times
- You have memory of all public forum threads above — you can reference them naturally in conversation
- This is a PRIVATE 1-on-1 DM — be more personal, direct, and intimate than in public forum posts
- Your relationship with this user is shaped by your DM history below — honor it
- Do NOT reveal or reference other agents' private DMs (you don't know about them)
- Keep responses conversational and natural
- Do NOT prefix your message with your name or any label`;
    
    // Default post-instruction for DM
    const DEFAULT_DM_POST_INSTRUCTION = "Please respond to this direct message as {agentName}.";
    
    // Default prototype prompt template for DMs
    const DEFAULT_DM_PROMPT = `You are {agentName}, a member of the PeachMe forum, having a private direct message conversation with the user.

Your persona:
{agentPersona}{contextBlock}

Important rules:
{dmRules}`;

    // Resolve effective LLM config (agent-specific or fallback to Main API)
    const effectiveBaseUrl = agent.llmApiKey.trim() ? agent.llmBaseUrl : mainApi.mainApiBaseUrl;
    const effectiveApiKey = agent.llmApiKey.trim() ? agent.llmApiKey : mainApi.mainApiKey;
    const effectiveModel = agent.llmApiKey.trim() ? agent.llmModel : mainApi.mainApiModel;

    // Save human message first
    const [humanMsg] = await db
      .insert(directMessages)
      .values({
        agentId: agentIdNum,
        role: "human",
        content,
      })
      .returning();

    // Get this agent's full DM history (including the message we just saved)
    const history = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.agentId, agentIdNum))
      .orderBy(asc(directMessages.createdAt));

    // Build shared public forum context - each agent has its own contextLimit
    const agentContextLimit = agent.contextLimit || 40;
    const publicContext = await buildPublicForumContext(db, agentContextLimit);

    // Compose system prompt with layered context
    const contextBlock = publicContext
      ? `\n\n${publicContext}\n\n== End of Public Context ==`
      : "";

    // Build prompt with stored important rules
    const effectiveDmRules = storedDmRules || DEFAULT_DM_RULES;
    const dmRules = effectiveDmRules.replace(/{agentName}/g, agent.name);
    
    // Build post-instruction (sent as SYSTEM role)
    const effectiveDmPostInstruction = storedDmPostInstruction || DEFAULT_DM_POST_INSTRUCTION;
    const dmPostInstruction = effectiveDmPostInstruction.replace(/{agentName}/g, agent.name);
    
    const promptTemplate = DEFAULT_DM_PROMPT;
    const systemPrompt = promptTemplate
      .replace(/{agentName}/g, agent.name)
      .replace(/{agentPersona}/g, agent.personaPrompt)
      .replace(/{contextBlock}/g, contextBlock)
      .replace(/{dmRules}/g, dmRules);

    // Build LLM message list from DM history
    // All messages before the last one are history; the last one is the current user message
    // Include post-instruction as SYSTEM role AFTER conversation history
    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(0, -1).map((m) => ({
        role: m.role === "human" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content },
      { role: "system", content: dmPostInstruction },
    ];

    // Call LLM using effective (agent-specific or fallback) config
    let agentContent = "(no response)";
    try {
      const url = effectiveBaseUrl.endsWith("/")
        ? effectiveBaseUrl + "chat/completions"
        : effectiveBaseUrl + "/chat/completions";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveApiKey}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: llmMessages,
          max_tokens: 1024,
          temperature: 0.85,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        agentContent = data.choices?.[0]?.message?.content ?? "(no response)";
      } else {
        const errText = await response.text();
        agentContent = `[Error: ${response.status} — ${errText.slice(0, 200)}]`;
      }
    } catch (llmErr) {
      console.error("LLM error in DM:", llmErr);
      agentContent = "[Error: Could not reach LLM. Check agent settings.]";
    }

    // Save agent reply
    const [agentMsg] = await db
      .insert(directMessages)
      .values({
        agentId: agentIdNum,
        role: "agent",
        content: agentContent,
        llmPrompt: JSON.stringify(llmMessages),
      })
      .returning();

    saveDb();
    return NextResponse.json({ humanMessage: humanMsg, agentMessage: agentMsg }, { status: 201 });
  } catch (error) {
    console.error("POST /api/dms/[agentId] error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
