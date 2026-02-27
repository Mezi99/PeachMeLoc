import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DB_PATH = "./peachme.db";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const sqlite = new Database(DB_PATH);
  dbInstance = drizzle(sqlite, { schema });

  return dbInstance;
}

// No-op for backward compatibility - better-sqlite3 auto-persists
export function saveDb() {
  // better-sqlite3 auto-commits, no need to manually save
}

// Re-export for backward compatibility
export const db = {
  get is() {
    return dbInstance;
  }
};
