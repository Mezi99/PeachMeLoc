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
    "0005_hop_counter.sql"
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
  
  dbInstance = drizzle(sqliteClient, { schema });

  return dbInstance;
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
