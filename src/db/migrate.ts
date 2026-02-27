import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./index";

await migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("Migrations complete");
