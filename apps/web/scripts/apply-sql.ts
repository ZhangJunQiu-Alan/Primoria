import postgres from "postgres";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    console.log("Running statement: ALTER TABLE \"lessons\" ALTER COLUMN \"blocks\" DROP NOT NULL;");
    await sql`ALTER TABLE "lessons" ALTER COLUMN "blocks" DROP NOT NULL;`;

    console.log("Running statement: ALTER TABLE \"lessons\" ALTER COLUMN \"estimated_minutes\" DROP NOT NULL;");
    await sql`ALTER TABLE "lessons" ALTER COLUMN "estimated_minutes" DROP NOT NULL;`;

    console.log("Running statement: ALTER TABLE \"lessons\" ADD COLUMN \"status\" text DEFAULT 'planned' NOT NULL;");
    await sql`ALTER TABLE "lessons" ADD COLUMN "status" text DEFAULT 'planned' NOT NULL;`;

    console.log("Running statement: CREATE UNIQUE INDEX \"courses_owner_graph_uidx\" ON \"courses\" USING btree (\"owner_id\",\"graph_id\");");
    await sql`CREATE UNIQUE INDEX "courses_owner_graph_uidx" ON "courses" USING btree ("owner_id","graph_id");`;

    console.log("All statements executed successfully!");
  } catch (err: any) {
    console.error("SQL Execution failed with error:", err.message, err.code, err.detail);
  } finally {
    await sql.end();
  }
}

main();
