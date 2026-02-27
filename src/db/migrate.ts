import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";

await migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("Migrations complete");
