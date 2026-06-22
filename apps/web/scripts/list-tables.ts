import postgres from "postgres";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    console.log("Tables in public schema:");
    console.log(tables.map(t => t.table_name));

    console.log("\nAttempting SELECT from courses...");
    const result = await sql`
      SELECT * FROM "courses" LIMIT 1
    `;
    console.log("Select success! First row:", result);
  } catch (err: any) {
    console.error("Query failed with error:", err.message, err.code, err.detail);
  } finally {
    await sql.end();
  }
}

main();
