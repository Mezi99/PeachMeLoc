import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // Must be unique for @mentions
  avatar: text("avatar").notNull().default("🤖"),
  personaPrompt: text("persona_prompt").notNull(),
  llmBaseUrl: text("llm_base_url").notNull().default("https://api.openai.com/v1"),
  llmApiKey: text("llm_api_key").notNull().default(""),
  llmModel: text("llm_model").notNull().default("gpt-4o-mini"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  contextLimit: integer("context_limit").notNull().default(30), // Max posts to include in context
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const channels = sqliteTable("channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  emoji: text("emoji").notNull().default("💬"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const threads = sqliteTable("threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull().default("General"),
  channelId: integer("channel_id").references(() => channels.id),
  authorName: text("author_name").notNull().default("You"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  replyCount: integer("reply_count").notNull().default(0),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  threadId: integer("thread_id").notNull().references(() => threads.id),
  content: text("content").notNull(),
  authorType: text("author_type").notNull(), // "human" | "agent"
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar").notNull().default("👤"),
  agentId: integer("agent_id").references(() => agents.id),
  llmPrompt: text("llm_prompt"), // JSON string of messages sent to LLM (for agents only)
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const directMessages = sqliteTable("direct_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id),
  role: text("role").notNull(), // "human" | "agent"
  content: text("content").notNull(),
  llmPrompt: text("llm_prompt"), // JSON string of messages sent to LLM (for agents only)
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Singleton row (id=1) for user/app settings
// publicImportantRules: The "Important rules" section for public thread responses
// dmImportantRules: The "Important rules" section for DM conversations
// prototypePublicRules / prototypeDmRules: Default prototypes for reset functionality
// publicPostInstruction: Post-instruction for public threads (sent as SYSTEM role)
// dmPostInstruction: Post-instruction for DMs (sent as SYSTEM role)
// prototypePublicPostInstruction / prototypeDmPostInstruction: Default post-instructions
export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nickname: text("nickname").notNull().default("You"),
  mainApiBaseUrl: text("main_api_base_url").notNull().default("https://api.openai.com/v1"),
  mainApiKey: text("main_api_key").notNull().default(""),
  mainApiModel: text("main_api_model").notNull().default("gpt-4o-mini"),
  hopCounter: integer("hop_counter").notNull().default(2), // Max agent-to-agent reply hops
  publicImportantRules: text("public_important_rules"), // User's custom public thread rules
  dmImportantRules: text("dm_important_rules"), // User's custom DM rules
  prototypePublicRules: text("prototype_public_rules"), // Default public rules
  prototypeDmRules: text("prototype_dm_rules"), // Default DM rules
  publicPostInstruction: text("public_post_instruction"), // User's custom public post-instruction
  dmPostInstruction: text("dm_post_instruction"), // User's custom DM post-instruction
  prototypePublicPostInstruction: text("prototype_public_post_instruction"), // Default public post-instruction
  prototypeDmPostInstruction: text("prototype_dm_post_instruction"), // Default DM post-instruction
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
