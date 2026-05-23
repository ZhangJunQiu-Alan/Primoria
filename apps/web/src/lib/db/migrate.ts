import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDb } from "./client";

export async function runMigrations() {
  await migrate(getDb(), { migrationsFolder: "drizzle" });
}
