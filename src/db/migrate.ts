import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

const DB_PATH = "./peachme.db";
const MIGRATIONS_FOLDER = "./src/db/migrations";

function runMigrations() {
  const sqlite = new Database(DB_PATH);
  const db = drizzle(sqlite);

  // Run migrations manually using better-sqlite3
  const migrationFiles = [
    "0000_glorious_natasha_romanoff.sql",
    "0001_old_centennial.sql",
    "0002_user_settings.sql",
    "0003_llm_prompt.sql",
    "0004_agent_name_unique.sql",
    "0005_hop_counter.sql"
  ];

  for (const file of migrationFiles) {
    const sql = readFileSync(join(MIGRATIONS_FOLDER, file), "utf-8");
    // Split by semicolons and run each statement
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        sqlite.exec(stmt);
      }
    }
    console.log(`Executed migration: ${file}`);
  }

  console.log("Migrations complete!");
}

runMigrations();
