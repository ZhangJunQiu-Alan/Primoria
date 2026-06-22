import postgres from "postgres";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'lessons'
    `;
    console.log("Columns in lessons table:");
    console.log(columns.map(c => `${c.column_name} (${c.data_type})`));
  } catch (err: any) {
    console.error("Query failed with error:", err.message);
  } finally {
    await sql.end();
  }
}

main();
