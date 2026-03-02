import initSqlJs, { Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DB_PATH = "./peachme.db";
const MIGRATIONS_FOLDER = "./src/db/migrations";

async function runMigrations() {
  const SQL = await initSqlJs();
  
  let db: Database;
  
  // Load existing database or create new one
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Run migrations manually
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
    "0009_summarization.sql",
    "0010_channel_inactive_flag.sql",
    "0011_user_settings_context_limit.sql",
    "0012_performance_indexes.sql",
    "0013_posts_llm_model.sql"
  ];

  for (const file of migrationFiles) {
    const sql = readFileSync(join(MIGRATIONS_FOLDER, file), "utf-8");
    // Split by semicolons and run each statement
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        db.run(stmt);
      }
    }
    console.log(`Executed migration: ${file}`);
  }

  // Save the database
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
  
  console.log("Migrations complete!");
}

runMigrations();
