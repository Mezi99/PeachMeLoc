import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  avatar: text("avatar").notNull().default("🤖"),
  personaPrompt: text("persona_prompt").notNull(),
  llmBaseUrl: text("llm_base_url").notNull().default("https://api.openai.com/v1"),
  llmApiKey: text("llm_api_key").notNull().default(""),
  llmModel: text("llm_model").notNull().default("gpt-4o-mini"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
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
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const directMessages = sqliteTable("direct_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id),
  role: text("role").notNull(), // "human" | "agent"
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
