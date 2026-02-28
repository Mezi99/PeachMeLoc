import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, syncForumFromCookie, withDbClient } from "@/db";
import { posts, threads, agents, directMessages, channels, userSettings, threadSummaries } from "@/db/schema";
import { eq, asc, desc, ne } from "drizzle-orm";

// Ensure hop_counter column exists (run migration if needed)
async function ensureHopCounterColumn() {
  try {
    await withDbClient((client) => {
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
 * Fetches the last N posts across ALL threads (excluding the current thread).
 */
async function buildPublicForumContext(db: ReturnType<typeof getDb>, currentThreadId: number, limit: number = 30): Promise<string> {
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
    .limit(limit);

  if (recentPosts.length === 0) {
    return "";
  }

  const byThread = new Map<number, { title: string; category: string; posts: typeof recentPosts }>();
  for (const p of recentPosts) {
    if (!byThread.has(p.threadId)) {
      byThread.set(p.threadId, { title: p.threadTitle, category: p.threadCategory, posts: [] });
    }
    byThread.get(p.threadId)!.posts.push(p);
  }

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
 */
async function buildPrivateDMContext(db: ReturnType<typeof getDb>, agentId: number): Promise<string> {
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
    const speaker = dm.role === "human" ? "User" : "You";
    lines.push(`  ${speaker}: ${dm.content.slice(0, 300)}${dm.content.length > 300 ? "…" : ""}`);
  }

  return lines.join("\n");
}

/**
 * Get existing thread summaries for an agent.
 */
async function getThreadSummaries(db: ReturnType<typeof getDb>, threadId: number, agentId: number): Promise<string> {
  const summaries = await db
    .select()
    .from(threadSummaries)
    .where(eq(threadSummaries.threadId, threadId))
    .orderBy(asc(threadSummaries.createdAt));

  if (summaries.length === 0) {
    return "";
  }

  const lines: string[] = ["== Earlier Discussion Summary =="];
  for (const s of summaries) {
    lines.push(s.summaryContent);
  }

  return lines.join("\n\n");
}

/**
 * Check if summarization is needed and trigger it if so.
 * Returns true if summarization was triggered.
 */
async function maybeTriggerSummarization(
  db: ReturnType<typeof getDb>,
  threadId: number,
  agentId: number,
  settings: {
    summarizationEnabled?: boolean;
    summarizationModel?: string;
    summarizationInterval?: number;
    summarizationMessagesToSummarize?: number;
    mainApiBaseUrl?: string;
    mainApiKey?: string;
  }
): Promise<boolean> {
  // Check if summarization is enabled
  if (!settings.summarizationEnabled) {
    return false;
  }

  const interval = settings.summarizationInterval || 50;
  const messagesToSummarize = settings.summarizationMessagesToSummarize || 30;

  // Get the latest summary for this thread+agent (if any)
  const latestSummary = await db
    .select()
    .from(threadSummaries)
    .where(eq(threadSummaries.threadId, threadId))
    .orderBy(desc(threadSummaries.summarizedUpToPostId))
    .limit(1);

  // Determine which posts have not yet been summarized
  let startPostId = 0;
  if (latestSummary.length > 0) {
    startPostId = latestSummary[0].summarizedUpToPostId;
  }

  // Count posts since last summary point
  const unsummarizedPosts = await db
    .select({ count: posts.id })
    .from(posts)
    .where(eq(posts.threadId, threadId));

  const totalPosts = unsummarizedPosts[0]?.count || 0;
  const unsummarizedCount = totalPosts - startPostId;

  // Check if we've reached the interval
  if (unsummarizedCount < interval) {
    return false;
  }

  // Get posts to summarize (the older ones that haven't been summarized yet)
  const postsToSummarize = await db
    .select()
    .from(posts)
    .where(eq(posts.threadId, threadId))
    .orderBy(asc(posts.id))
    .limit(messagesToSummarize);

  if (postsToSummarize.length === 0) {
    return false;
  }

  // Get the last post ID we're summarizing
  const lastPostId = postsToSummarize[postsToSummarize.length - 1].id;

  // Build a summary using the LLM
  const summarizationModel = settings.summarizationModel || "gpt-4o-mini";
  const summarizationPrompt = `Please summarize this conversation concisely, preserving key points, opinions, and any important information:\n\n` +
    postsToSummarize.map(p => `${p.authorName}: ${p.content}`).join("\n");

  try {
    // Call the LLM to generate summary
    const summaryResponse = await fetch(`${settings.mainApiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.mainApiKey}`,
      },
      body: JSON.stringify({
        model: summarizationModel,
        messages: [
          { role: "system", content: "You are a helpful assistant that summarizes conversations concisely." },
          { role: "user", content: summarizationPrompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!summaryResponse.ok) {
      console.error("Summarization LLM call failed:", summaryResponse.status);
      return false;
    }

    const summaryData = await summaryResponse.json();
    const summaryContent = summaryData.choices?.[0]?.message?.content || "";

    if (!summaryContent) {
      return false;
    }

    // Save the summary
    await db.insert(threadSummaries).values({
      threadId,
      agentId,
      summaryContent,
      summarizedUpToPostId: lastPostId,
    });

    saveDb();
    console.log(`[Summarization] Created summary for thread ${threadId}, agent ${agentId}, up to post ${lastPostId}`);
    return true;
  } catch (err) {
    console.error("Summarization error:", err);
    return false;
  }
}

/**
 * Extract @mentions from content and return mentioned agent names.
 * Supports @all and @both keywords.
 */
function extractMentions(content: string, allAgentNames: string[]): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const name = match[1].toLowerCase();
    
    // Handle special keywords
    if (name === "all" || name === "both") {
      mentions.push(...allAgentNames.map(n => n.toLowerCase()));
    } else {
      mentions.push(name);
    }
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Check if sender is an agent (by name)
 */
function isAgent(senderName: string, agentNames: string[]): boolean {
  return agentNames.map(n => n.toLowerCase()).includes(senderName.toLowerCase());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncForumFromCookie();
    await ensureHopCounterColumn();
    await ensureSystemPromptColumns();
    await ensureContextLimitColumn();
    const db = getDb();
    const { id } = await params;
    const threadId = parseInt(id);
    
    // Parse request body for initial mentionedAgentIds (from human's post)
    let initialMentions: number[] = [];
    try {
      const body = await req.json();
      initialMentions = body.mentionedAgentIds || [];
    } catch {
      // No body = no initial mentions
    }

    // Get thread info
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

    // Get settings
    const mainApiRows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
    const mainApi = mainApiRows[0] ?? {
      mainApiBaseUrl: "https://api.openai.com/v1",
      mainApiKey: "",
      mainApiModel: "gpt-4o-mini",
      hopCounter: 2,
      nickname: "User",
    };
    const maxHops = mainApi.hopCounter ?? 2;
    const userNickname = mainApi.nickname?.trim() || "User";
    
    const storedPublicRules = mainApi.publicImportantRules ?? mainApi.prototypePublicRules ?? null;
    const storedPublicPostInstruction = (mainApi as Record<string, unknown>).publicPostInstruction as string | null 
      ?? (mainApi as Record<string, unknown>).prototypePublicPostInstruction as string | null 
      ?? null;
    
    const DEFAULT_PUBLIC_RULES = `- Stay in character as {agentName} at all times
- You have memory of all public forum threads above — you can reference them naturally
- Your private DM history with the user is personal — you may let it subtly influence your tone and relationship, but don't quote DMs verbatim in public
- Write naturally as a forum member — conversational, opinionated, engaging
- Keep responses focused and reasonably concise (2-4 paragraphs max)
- React to what others have said in this thread
- You CAN mention other agents by using @username to get their attention
- Do NOT prefix your message with your name or any label
- Do NOT use markdown headers, just plain conversational text`;
    
    const DEFAULT_PUBLIC_POST_INSTRUCTION = "Please respond to this forum thread as {agentName}.";
    
    const DEFAULT_PROTOTYPE_PROMPT = `You are {agentName}, a member of the PeachMe forum.

Your persona:
{agentPersona}{contextBlock}

You are now responding in the thread: "{threadTitle}" [{threadCategory}] in channel {channelName}.

Important rules:
{importantRules}`;

    const channelLabel = thread.channelName
      ? `${thread.channelEmoji ?? ""} #${thread.channelName}`.trim()
      : "General";

    // Get all active agents
    const allActiveAgents = await db.select().from(agents).where(eq(agents.isActive, true));
    const allAgentNames = allActiveAgents.map(a => a.name);
    
    if (allActiveAgents.length === 0) {
      return NextResponse.json({ error: "No active agents found" }, { status: 400 });
    }

    // === ROUTING LOGIC (like the Python example) ===
    
    // Track which agents have responded in the CURRENT hop (to prevent duplicate in same hop)
    const respondedInCurrentHop = new Set<number>();
    
    // Queue of agents to respond (initially from human's @mentions)
    let pendingAgentIds: number[] = [...initialMentions];
    
    // If no mentions, all agents respond (default behavior)
    if (pendingAgentIds.length === 0) {
      pendingAgentIds = allActiveAgents.map(a => a.id);
    }
    
    // Track current hop
    let currentHop = 0;
    
    // Encode SSE
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Main loop: keep responding while there are pending agents and within hop limit
        while (pendingAgentIds.length > 0 && currentHop < maxHops) {
          console.log(`[Hop ${currentHop}] Processing ${pendingAgentIds.length} agents:`, pendingAgentIds);
          
          // Get the next batch of agents to respond
          const currentBatch = [...pendingAgentIds];
          pendingAgentIds = []; // Clear for next round
          respondedInCurrentHop.clear(); // Clear for new hop
          
          // Shuffle for randomness within each hop
          currentBatch.sort(() => Math.random() - 0.5);
          
          // Process each agent in the current batch
          for (const agentId of currentBatch) {
            // Skip if already responded in THIS hop (prevent duplicate)
            if (respondedInCurrentHop.has(agentId)) {
              continue;
            }
            
            const agent = allActiveAgents.find(a => a.id === agentId);
            if (!agent) continue;
            
            // Mark as responded in this hop
            respondedInCurrentHop.add(agentId);
            
            // Send starting event
            const startData = JSON.stringify({ 
              type: 'agent_starting', 
              agentName: agent.name,
              agentAvatar: agent.avatar,
            });
            controller.enqueue(encoder.encode(`data: ${startData}\n\n`));
            
            // Get latest posts for context
            const latestPosts = await db
              .select()
              .from(posts)
              .where(eq(posts.threadId, threadId))
              .orderBy(asc(posts.createdAt));
            
            // Build context
            const agentContextLimit = agent.contextLimit || 30;
            const publicForumContext = await buildPublicForumContext(db, threadId, agentContextLimit);
            const privateDMContext = await buildPrivateDMContext(db, agent.id);
            const threadSummaryContext = await getThreadSummaries(db, threadId, agent.id);
            
            const contextSections: string[] = [];
            if (threadSummaryContext) contextSections.push(threadSummaryContext);
            if (publicForumContext) contextSections.push(publicForumContext);
            if (privateDMContext) contextSections.push(privateDMContext);
            
            const contextBlock = contextSections.length > 0
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
            let responseContent = "";
            
            try {
              responseContent = await callLLM(
                effectiveBaseUrl,
                effectiveApiKey,
                effectiveModel,
                messages
              );
              
              const [newPost] = await db
                .insert(posts)
                .values({
                  threadId,
                  content: responseContent,
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
              responseContent = errorPost.content;
            }
            
            // Send response
            if (agentPost) {
              const data = JSON.stringify({ 
                type: 'agent_response', 
                agentName: agentPost.authorName,
                agentAvatar: agentPost.authorAvatar,
                post: agentPost 
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              
              // Maybe trigger summarization after agent response
              await maybeTriggerSummarization(db, threadId, agent.id, mainApi);
            }
            
            // Update thread reply count
            const allPosts = await db.select().from(posts).where(eq(posts.threadId, threadId));
            await db
              .update(threads)
              .set({
                replyCount: allPosts.length - 1,
                lastActivityAt: new Date(),
              })
              .where(eq(threads.id, threadId));
            
            saveDb();
            
            // === KEY PART: Parse @mentions from agent's response ===
            // After each agent responds, check if they mentioned other agents
            const mentionedNames = extractMentions(responseContent, allAgentNames);
            
            if (mentionedNames.length > 0) {
              console.log(`[Hop ${currentHop}] ${agent.name} mentioned:`, mentionedNames);
              
              // Find agent IDs for mentioned names
              for (const name of mentionedNames) {
                const mentionedAgent = allActiveAgents.find(
                  a => a.name.toLowerCase() === name
                );
                
                if (mentionedAgent) {
                  // Add to next hop queue (always add if mentioned, regardless of recent response)
                  if (!pendingAgentIds.includes(mentionedAgent.id)) {
                    pendingAgentIds.push(mentionedAgent.id);
                  }
                }
              }
            }
          }
          
          // Move to next hop
          currentHop++;
          console.log(`[Hop ${currentHop}] Next batch:`, pendingAgentIds);
        }
        
        // Send done message
        if (currentHop >= maxHops && pendingAgentIds.length > 0) {
          console.log(`[Router] Hop limit reached (${maxHops}), stopping chain`);
        }
        
        controller.enqueue(encoder.encode(`data: {"type":"done"}\n\n`));
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
