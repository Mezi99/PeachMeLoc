import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync, readdirSync, unlinkSync, readFileSync, closeSync, openSync, statSync } from "fs";
import path from "path";
import { cookies } from "next/headers";

const DB_DIR = "./data";
const DB_EXTENSION = ".db";
const MIGRATIONS_FOLDER = "./src/db/migrations";
const FORUM_COOKIE_NAME = "peachme_forum";

// Store the current database path in memory
let currentDbPath: string = path.join(DB_DIR, `peachme${DB_EXTENSION}`);
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteClient: Database.Database | null = null;

// Ensure data directory exists
function ensureDataDir() {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }
  
  // Create default database if it doesn't exist
  const defaultDbPath = path.join(DB_DIR, `peachme${DB_EXTENSION}`);
  if (!existsSync(defaultDbPath)) {
    runMigrationsOnDb(defaultDbPath);
  }
}

// Run migrations on a database
function runMigrationsOnDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  
  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  
  const migrationFiles = [
    "0000_glorious_natasha_romanoff.sql",
    "0001_old_centennial.sql",
    "0002_user_settings.sql",
    "0003_llm_prompt.sql",
    "0004_agent_name_unique.sql",
    "0005_hop_counter.sql",
    "0006_system_prompt.sql",
    "0007_important_rules.sql",
    "0008_agent_context_limit.sql",
    "0010_channel_inactive_flag.sql",
    "0011_user_settings_context_limit.sql",
    "0012_performance_indexes.sql",
    "0013_posts_llm_model.sql"
  ];

  for (const file of migrationFiles) {
    const sql = readFileSync(path.join(MIGRATIONS_FOLDER, file), "utf-8");
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        sqlite.exec(stmt);
      }
    }
  }
  
  sqlite.close();
}

// Get the path to the current database
export function getDbPath(): string {
  return currentDbPath;
}

// Set the current database path and reload the connection
export function setDbPath(dbPath: string): void {
  // Close existing connection properly
  if (sqliteClient) {
    try {
      // Force close WAL before closing the database
      sqliteClient.pragma('wal_checkpoint(TRUNCATE)');
      sqliteClient.close();
    } catch (e) {
      // Ignore close errors
    }
    sqliteClient = null;
  }
  dbInstance = null;
  currentDbPath = dbPath;
}

// Sync the database path based on the forum cookie
// This should be called at the start of each API route
export async function syncForumFromCookie(): Promise<string> {
  const cookieStore = await cookies();
  const forumName = cookieStore.get(FORUM_COOKIE_NAME)?.value || null;
  
  if (forumName) {
    const newPath = path.join(DB_DIR, `${forumName}${DB_EXTENSION}`);
    // Only switch if the path is different
    if (newPath !== currentDbPath) {
      setDbPath(newPath);
    }
    return forumName;
  }
  
  // Default to peachme if no cookie
  const defaultPath = path.join(DB_DIR, `peachme${DB_EXTENSION}`);
  if (defaultPath !== currentDbPath) {
    setDbPath(defaultPath);
  }
  return 'peachme';
}

// Get or create database instance
export function getDb() {
  if (dbInstance) return dbInstance;

  ensureDataDir();
  
  sqliteClient = new Database(currentDbPath);
  
  // Enable WAL mode for better concurrency and to prevent locking issues
  sqliteClient.pragma('journal_mode = WAL');
  sqliteClient.pragma('busy_timeout = 5000');
  
  // Run fallback migrations for existing databases
  runFallbackMigrations(sqliteClient);
  
  dbInstance = drizzle(sqliteClient, { schema });

  return dbInstance;
}

// Run fallback migrations for existing databases (using ALTER TABLE)
function runFallbackMigrations(client: Database.Database) {
  try {
    // Check if agents table has context_limit column
    const agentsTableInfo = client.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
    const hasContextLimit = agentsTableInfo.some((col) => col.name === "context_limit");
    if (!hasContextLimit) {
      console.log("Adding context_limit column to agents (fallback migration)...");
      client.exec("ALTER TABLE agents ADD COLUMN context_limit INTEGER DEFAULT 30;");
    }

    // Check if user_settings table has summarization columns
    const userSettingsTableInfo = client.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[];
    let hasSummarizationEnabled = userSettingsTableInfo.some((col) => col.name === "summarization_enabled");
    let hasSummarizationModel = userSettingsTableInfo.some((col) => col.name === "summarization_model");
    let hasSummarizationInterval = userSettingsTableInfo.some((col) => col.name === "summarization_interval");
    let hasSummarizationMessages = userSettingsTableInfo.some((col) => col.name === "summarization_messages_to_summarize");

    if (!hasSummarizationEnabled) {
      console.log("Adding summarization_enabled column (fallback migration)...");
      client.exec("ALTER TABLE user_settings ADD COLUMN summarization_enabled INTEGER DEFAULT 0;");
    }
    if (!hasSummarizationModel) {
      console.log("Adding summarization_model column (fallback migration)...");
      client.exec("ALTER TABLE user_settings ADD COLUMN summarization_model TEXT DEFAULT 'gpt-4o-mini';");
    }
    if (!hasSummarizationInterval) {
      console.log("Adding summarization_interval column (fallback migration)...");
      client.exec("ALTER TABLE user_settings ADD COLUMN summarization_interval INTEGER DEFAULT 50;");
    }
    if (!hasSummarizationMessages) {
      console.log("Adding summarization_messages_to_summarize column (fallback migration)...");
      client.exec("ALTER TABLE user_settings ADD COLUMN summarization_messages_to_summarize INTEGER DEFAULT 30;");
    }

    // Check if thread_summaries table exists
    const threadSummariesTableInfo = client.prepare("PRAGMA table_info(thread_summaries)").all() as { name: string }[];
    if (threadSummariesTableInfo.length === 0) {
      console.log("Creating thread_summaries table (fallback migration)...");
      client.exec(`
        CREATE TABLE thread_summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          thread_id INTEGER NOT NULL REFERENCES threads(id),
          agent_id INTEGER NOT NULL REFERENCES agents(id),
          summary_content TEXT NOT NULL,
          summarized_up_to_post_id INTEGER NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);
      client.exec("CREATE INDEX IF NOT EXISTS idx_thread_summaries_thread_agent ON thread_summaries(thread_id, agent_id)");
    }

    // Check if channels table has is_active column
    const channelsTableInfo = client.prepare("PRAGMA table_info(channels)").all() as { name: string }[];
    const hasChannelsIsActive = channelsTableInfo.some((col) => col.name === "is_active");
    if (!hasChannelsIsActive) {
      console.log("Adding is_active column to channels (fallback migration)...");
      client.exec("ALTER TABLE channels ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;");
      client.exec("CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active)");
    }

    // Check if threads table has is_active column
    const threadsTableInfo = client.prepare("PRAGMA table_info(threads)").all() as { name: string }[];
    const hasThreadsIsActive = threadsTableInfo.some((col) => col.name === "is_active");
    if (!hasThreadsIsActive) {
      console.log("Adding is_active column to threads (fallback migration)...");
      client.exec("ALTER TABLE threads ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;");
      client.exec("CREATE INDEX IF NOT EXISTS idx_threads_active ON threads(is_active)");
    }

    // Check if user_settings table has context_limit column (already fetched above)
    let hasUserSettingsContextLimit = userSettingsTableInfo.some((col) => col.name === "context_limit");
    if (!hasUserSettingsContextLimit) {
      console.log("Adding context_limit column to user_settings (fallback migration)...");
      client.exec("ALTER TABLE user_settings ADD COLUMN context_limit INTEGER NOT NULL DEFAULT 20;");
    }

    // Add performance indexes (if they don't exist)
    console.log("Adding performance indexes...");
    client.exec("CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_posts_agent_id ON posts(agent_id)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_posts_thread_created ON posts(thread_id, created_at)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_dm_agent_id ON direct_messages(agent_id)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_dm_created_at ON direct_messages(created_at)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_threads_channel_id ON threads(channel_id)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_threads_last_activity ON threads(last_activity_at DESC)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_threads_is_active ON threads(is_active)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active)");
    client.exec("CREATE INDEX IF NOT EXISTS idx_thread_summaries_thread_agent ON thread_summaries(thread_id, agent_id)");
  } catch (e) {
    console.error("Fallback migration error:", e);
  }
}

// Get database client directly (for raw queries)
// IMPORTANT: Always close the client after use to prevent file locking!
export function getDbClient(): Database.Database {
  ensureDataDir();
  const client = new Database(currentDbPath);
  // Configure for better concurrency
  client.pragma('journal_mode = WAL');
  client.pragma('busy_timeout = 5000');
  return client;
}

// Helper to safely use a database client with automatic cleanup
export function withDbClient<T>(fn: (client: Database.Database) => T): T {
  const client = getDbClient();
  try {
    return fn(client);
  } finally {
    client.close();
  }
}

// No-op for backward compatibility - better-sqlite3 auto-persists
export function saveDb() {
  // better-sqlite3 auto-commits, no need to manually save
}

// List all available forum instances
export function listForums(): { name: string; path: string; size: number }[] {
  ensureDataDir();
  
  const files = readdirSync(DB_DIR).filter(f => f.endsWith(DB_EXTENSION));
  
  return files.map(file => {
    const filePath = path.join(DB_DIR, file);
    const stats = require('fs').statSync(filePath);
    return {
      name: file.replace(DB_EXTENSION, ''),
      path: filePath,
      size: stats.size
    };
  });
}

// Create a new forum instance with migrations
export function createForum(name: string): string {
  ensureDataDir();
  
  const dbPath = path.join(DB_DIR, `${name}${DB_EXTENSION}`);
  
  if (existsSync(dbPath)) {
    throw new Error(`Forum "${name}" already exists`);
  }
  
  // Create database and run migrations
  runMigrationsOnDb(dbPath);
  
  return dbPath;
}

// Delete a forum instance
export function deleteForum(name: string): void {
  ensureDataDir();
  
  const dbPath = path.join(DB_DIR, `${name}${DB_EXTENSION}`);
  
  if (!existsSync(dbPath)) {
    throw new Error(`Forum "${name}" does not exist`);
  }
  
  // Don't allow deleting the default peachme.db if it's the current one
  if (dbPath === currentDbPath) {
    throw new Error("Cannot delete the currently active forum");
  }
  
  unlinkSync(dbPath);
}

// Re-export for backward compatibility
export const db = {
  get is() {
    return dbInstance;
  }
};
