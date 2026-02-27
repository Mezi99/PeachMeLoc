import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DB_PATH = "./peachme.db";
const MIGRATIONS_FOLDER = "./src/db/migrations";

async function runMigrations() {
  const SQL = await initSqlJs();

  let sqlite: SqlJsDatabase;
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    sqlite = new SQL.Database(fileBuffer);
  } else {
    sqlite = new SQL.Database();
  }

  const db = drizzle(sqlite);

  // Run migrations manually using sql.js
  const migrationFiles = [
    "0000_glorious_natasha_romanoff.sql",
    "0001_old_centennial.sql",
    "0002_user_settings.sql"
  ];

  for (const file of migrationFiles) {
    const sql = readFileSync(join(MIGRATIONS_FOLDER, file), "utf-8");
    sqlite.run(sql);
    console.log(`Executed migration: ${file}`);
  }

  // Save the database after migrations
  const data = sqlite.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
  
  console.log("Migrations complete!");
}

runMigrations().catch(console.error);
