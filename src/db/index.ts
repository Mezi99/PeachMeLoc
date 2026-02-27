import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql.js";
import * as schema from "./schema";
import { readFileSync, writeFileSync, existsSync } from "fs";

const DB_PATH = "./peachme.db";

let sqliteDb: SqlJsDatabase | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(fileBuffer);
  } else {
    sqliteDb = new SQL.Database();
  }

  dbInstance = drizzle(sqliteDb, { schema });

  return dbInstance;
}

export function getDbSync() {
  if (dbInstance) return dbInstance;
  throw new Error("Database not initialized. Use getDb() instead.");
}

export function saveDb() {
  if (!sqliteDb) return;
  const data = sqliteDb.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

// Re-export for backward compatibility (will be initialized lazily)
export const db = {
  get is() {
    return dbInstance;
  }
};
