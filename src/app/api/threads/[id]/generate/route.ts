import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie, withDbClient } from "@/db";
import { posts, threads, agents, directMessages, channels, userSettings } from "@/db/schema";
import { eq, asc, desc, ne } from "drizzle-orm";

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

// Ensure system_prompt columns exist (run migration if needed)
async function ensureSystemPromptColumns() {
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

async function callLLM(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "(no response)";
}

/**
 * Build a shared public forum context block.
 * Fetches the last 30 posts across ALL threads (excluding the current thread,
 * which is passed separately as the active conversation).
 * All agents see this identically — it represents shared public knowledge.
 */
async function buildPublicForumContext(db: ReturnType<typeof getDb>, currentThreadId: number, userNickname: string): Promise<string> {
  // Get recent posts from OTHER threads (not the current one)
  const recentPosts = await db
    .select({
      postId: posts.id,
      content: posts.content,
      authorName: posts.authorName,
      authorType: posts.authorType,
      createdAt: posts.createdAt,
      threadId: posts.threadId,
      threadTitle: threads.title,
      threadCategory: threads.category,
    })
    .from(posts)
    .innerJoin(threads, eq(posts.threadId, threads.id))
    .where(ne(posts.threadId, currentThreadId))
    .orderBy(desc(posts.createdAt))
    .limit(30);

  if (recentPosts.length === 0) {
    return "";
  }

  // Group by thread for readability
  const byThread = new Map<
    number,
    { title: string; category: string; posts: typeof recentPosts }
  >();
  for (const p of recentPosts) {
    if (!byThread.has(p.threadId)) {
      byThread.set(p.threadId, { title: p.threadTitle, category: p.threadCategory, posts: [] });
    }
    byThread.get(p.threadId)!.posts.push(p);
  }

  // Reverse each thread's posts so they read chronologically
  const lines: string[] = ["== Public Forum — Recent Activity (shared knowledge) =="];
  for (const [, thread] of byThread) {
    lines.push(`\nThread: "${thread.title}" [${thread.category}]`);
    for (const p of [...thread.posts].reverse()) {
      lines.push(`  ${p.authorName}: ${p.content.slice(0, 300)}${p.content.length > 300 ? "…" : ""}`);
    }
  }

  return lines.join("\n");
}

/**
 * Build the private DM context for a specific agent.
 * Only this agent's DMs with the user are included — other agents' DMs are never exposed.
 */
async function buildPrivateDMContext(db: ReturnType<typeof getDb>, agentId: number, userNickname: string): Promise<string> {
  const dms = await db
    .select()
    .from(directMessages)
    .where(eq(directMessages.agentId, agentId))
    .orderBy(desc(directMessages.createdAt))
    .limit(20);

  if (dms.length === 0) {
    return "";
  }

  const lines: string[] = ["== Your Private DM History with the user =="];
  for (const dm of [...dms].reverse()) {
    const speaker = dm.role === "human" ? userNickname : "You";
    lines.push(`  ${speaker}: ${dm.content.slice(0, 300)}${dm.content.length > 300 ? "…" : ""}`);
  }

  return lines.join("\n");
}

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie(); // Sync forum based on cookie
    await ensureHopCounterColumn(); // Ensure column exists
    await ensureSystemPromptColumns(); // Ensure columns exist
    const db = getDb();
    const { id } = await params;
    const threadId = parseInt(id);
    
    // Parse request body for mentionedAgentIds
    let mentionedAgentIds: number[] = [];
    try {
      const body = await req.json();
      mentionedAgentIds = body.mentionedAgentIds || [];
    } catch {
      // If no JSON body, assume no mentions
    }

    // Get thread info (including channel name if any)
    const [thread] = await db
      .select({
        id: threads.id,
        title: threads.title,
        category: threads.category,
        channelId: threads.channelId,
        channelName: channels.name,
        channelEmoji: channels.emoji,
      })
      .from(threads)
      .leftJoin(channels, eq(threads.channelId, channels.id))
      .where(eq(threads.id, threadId));

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get main API fallback settings and hop counter
    const mainApiRows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    const mainApi = mainApiRows[0] ?? {
      mainApiBaseUrl: "https://api.openai.com/v1",
      mainApiKey: "",
      mainApiModel: "gpt-4o-mini",
      hopCounter: 2,
      nickname: "User",
    };
    const hopCounter = mainApi.hopCounter ?? 2;
    const userNickname = mainApi.nickname?.trim() || "User";
    
    // Get stored system prompt (or use default template)
    const storedPublicRules = mainApi.publicImportantRules ?? mainApi.prototypePublicRules ?? null;
    
    // Get stored public post-instruction (or use default)
    const storedPublicPostInstruction = (mainApi as Record<string, unknown>).publicPostInstruction as string | null 
      ?? (mainApi as Record<string, unknown>).prototypePublicPostInstruction as string | null 
      ?? null;
    
    // Default "Important rules" for public threads
    const DEFAULT_PUBLIC_RULES = `- Stay in character as {agentName} at all times
- You have memory of all public forum threads above — you can reference them naturally
- Your private DM history with the user is personal — you may let it subtly influence your tone and relationship, but don't quote DMs verbatim in public
- Write naturally as a forum member — conversational, opinionated, engaging
- Keep responses focused and reasonably concise (2-4 paragraphs max)
- React to what others have said in this thread
- You CAN mention other agents by using @username to get their attention
- Do NOT prefix your message with your name or any label
- Do NOT use markdown headers, just plain conversational text`;
    
    // Default post-instruction for public threads
    const DEFAULT_PUBLIC_POST_INSTRUCTION = "Please respond to this forum thread as {agentName}.";
    
    // Default prototype prompt template
    const DEFAULT_PROTOTYPE_PROMPT = `You are {agentName}, a member of the PeachMe forum.

Your persona:
{agentPersona}{contextBlock}

You are now responding in the thread: "{threadTitle}" [{threadCategory}] in channel {channelName}.

Important rules:
{importantRules}`;

    // Get existing posts for this thread (the active conversation)
    const existingPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.threadId, threadId))
      .orderBy(asc(posts.createdAt));

    // Build shared public context once (same for all agents)
    const publicContext = await buildPublicForumContext(db, threadId, userNickname);

    const channelLabel = thread.channelName
      ? `${thread.channelEmoji ?? ""} #${thread.channelName}`.trim()
      : "General";

    // Get all active agents
    const allActiveAgents = await db.select().from(agents).where(eq(agents.isActive, true));
    
    if (allActiveAgents.length === 0) {
      return NextResponse.json({ error: "No active agents found" }, { status: 400 });
    }

    // DETERMINE RESPONSE ORDER BASED ON @MENTIONS IN USER'S POST
    let orderedAgentIds: number[] = [];
    
    if (mentionedAgentIds.length > 0) {
      // User @mentioned specific agents - only those agents will respond
      // (others only if @mentioned in a later response)
      orderedAgentIds = [...mentionedAgentIds];
    } else {
      // No @mention in user's post - all agents respond in random order
      // Shuffle the array for randomness
      const shuffled = [...allActiveAgents].sort(() => Math.random() - 0.5);
      orderedAgentIds = shuffled.map(a => a.id);
    }

    // Track which agents have responded - used in stream below
    
    // Return streaming response using SSE
    // Each agent's response is streamed AS IT COMPLETES - capturing real LLM response time
    const encoder = new TextEncoder();
    
    // We need to re-query agents in order and stream each response as it completes
    // This is more complex but gives us real timing
    
    const stream = new ReadableStream({
      async start(controller) {
        // Process each agent in order, streaming their response as it completes
        for (const agentId of orderedAgentIds) {
          const agent = allActiveAgents.find(a => a.id === agentId);
          if (!agent) continue;
          
          // Send "starting" event - client shows typing indicator
          const startData = JSON.stringify({ 
            type: 'agent_starting', 
            agentName: agent.name,
            agentAvatar: agent.avatar,
          });
          controller.enqueue(encoder.encode(`data: ${startData}\n\n`));
          
          // Re-fetch the latest posts for context (each agent sees all previous responses)
          const latestPosts = await db
            .select()
            .from(posts)
            .where(eq(posts.threadId, threadId))
            .orderBy(asc(posts.createdAt));
          
          // Build context for this agent
          const privateDMContext = await buildPrivateDMContext(db, agent.id, userNickname);
          
          const contextSections: string[] = [];
          if (publicContext) contextSections.push(publicContext);
          if (privateDMContext) contextSections.push(privateDMContext);
          
          const contextBlock =
            contextSections.length > 0
              ? `\n\n${contextSections.join("\n\n")}\n\n== End of Context ==`
              : "";
          
          // Build prompt
          const effectivePublicRules = storedPublicRules || DEFAULT_PUBLIC_RULES;
          const publicRules = effectivePublicRules.replace(/{agentName}/g, agent.name);
          
          const effectivePublicPostInstruction = storedPublicPostInstruction || DEFAULT_PUBLIC_POST_INSTRUCTION;
          const publicPostInstruction = effectivePublicPostInstruction.replace(/{agentName}/g, agent.name);
          
          const promptTemplate = DEFAULT_PROTOTYPE_PROMPT;
          const systemPrompt = promptTemplate
            .replace(/{agentName}/g, agent.name)
            .replace(/{agentPersona}/g, agent.personaPrompt)
            .replace(/{contextBlock}/g, contextBlock)
            .replace(/{threadTitle}/g, thread.title)
            .replace(/{threadCategory}/g, thread.category)
            .replace(/{channelName}/g, channelLabel)
            .replace(/{importantRules}/g, publicRules);
          
          const conversationHistory = latestPosts.map((p) => ({
            role: p.authorType === "human" ? "user" : "assistant",
            content: `[${p.authorName}]: ${p.content}`,
          }));
          
          const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "system", content: publicPostInstruction },
          ];
          
          const effectiveBaseUrl = agent.llmApiKey.trim() ? agent.llmBaseUrl : mainApi.mainApiBaseUrl;
          const effectiveApiKey = agent.llmApiKey.trim() ? agent.llmApiKey : mainApi.mainApiKey;
          const effectiveModel = agent.llmApiKey.trim() ? agent.llmModel : mainApi.mainApiModel;
          
          let agentPost: typeof posts.$inferSelect | null = null;
          
          try {
            // This LLM call takes REAL time - that's what we want to capture!
            const content = await callLLM(
              effectiveBaseUrl,
              effectiveApiKey,
              effectiveModel,
              messages
            );
            
            const [newPost] = await db
              .insert(posts)
              .values({
                threadId,
                content,
                authorType: "agent",
                authorName: agent.name,
                authorAvatar: agent.avatar,
                agentId: agent.id,
                llmPrompt: JSON.stringify(messages),
              })
              .returning();
            
            agentPost = newPost;
          } catch (llmError) {
            console.error(`LLM error for agent ${agent.name}:`, llmError);
            const [errorPost] = await db
              .insert(posts)
              .values({
                threadId,
                content: `[Error: Could not generate response. Check API key and model settings for this agent.]`,
                authorType: "agent",
                authorName: agent.name,
                authorAvatar: agent.avatar,
                agentId: agent.id,
                llmPrompt: JSON.stringify(messages),
              })
              .returning();
            
            agentPost = errorPost;
          }
          
          // Send the actual response IMMEDIATELY after LLM returns - no artificial delay!
          if (agentPost) {
            const data = JSON.stringify({ 
              type: 'agent_response', 
              agentName: agentPost.authorName,
              agentAvatar: agentPost.authorAvatar,
              post: agentPost 
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          
          // Update thread reply count after each agent responds
          const allPosts = await db.select().from(posts).where(eq(posts.threadId, threadId));
          await db
            .update(threads)
            .set({
              replyCount: allPosts.length - 1,
              lastActivityAt: new Date(),
            })
            .where(eq(threads.id, threadId));
          
          saveDb();
          
          // NO artificial delay here - the next agent's LLM call naturally takes time!
          // Users will see the real response time for each agent
        }
        
        // Send done message
        controller.enqueue(encoder.encode(`data: {\"type\":\"done\"}\n\n`));
        controller.close();
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("POST /api/threads/[id]/generate error:", error);
    return NextResponse.json({ error: "Failed to generate responses" }, { status: 500 });
  }
}
