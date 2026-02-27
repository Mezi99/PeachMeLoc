import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync, readdirSync, unlinkSync, readFileSync, closeSync, openSync, statSync } from "fs";
import path from "path";

const DB_DIR = "./data";
const DB_EXTENSION = ".db";
const MIGRATIONS_FOLDER = "./src/db/migrations";

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
  
  const migrationFiles = [
    "0000_glorious_natasha_romanoff.sql",
    "0001_old_centennial.sql",
    "0002_user_settings.sql"
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
      sqliteClient.close();
    } catch (e) {
      // Ignore close errors
    }
    sqliteClient = null;
  }
  dbInstance = null;
  currentDbPath = dbPath;
}

// Get or create database instance
export function getDb() {
  if (dbInstance) return dbInstance;

  ensureDataDir();
  
  sqliteClient = new Database(currentDbPath);
  dbInstance = drizzle(sqliteClient, { schema });

  return dbInstance;
}

// Get database client directly (for raw queries)
export function getDbClient() {
  ensureDataDir();
  // Create a new client each time to avoid conflicts
  return new Database(currentDbPath);
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
