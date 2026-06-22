import postgres from "postgres";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const migrations = await sql`
      SELECT *
      FROM drizzle.__drizzle_migrations
      ORDER BY id
    `;
    console.log("Completed migrations in DB:");
    console.log(migrations);
  } catch (err: any) {
    console.error("Query failed with error:", err.message);
  } finally {
    await sql.end();
  }
}

main();
