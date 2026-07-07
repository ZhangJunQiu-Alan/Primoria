import postgres from "postgres";
import { loadLocalEnv } from "./load-local-env";
import { getDatabaseSsl } from "../src/lib/db/ssl";

loadLocalEnv();

type DatabaseInfo = {
  database: string;
  user: string;
  schema: string;
  serverAddress: string | null;
  serverPort: number;
  version: string;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Add the Primoria Postgres URL to apps/web/.env.local first.");
  }

  const parsed = new URL(databaseUrl);
  const ssl = getDatabaseSsl();
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    ...(ssl !== undefined ? { ssl } : {}),
  });

  try {
    const [info] = await sql<DatabaseInfo[]>`
      select
        current_database() as database,
        current_user as user,
        current_schema() as schema,
        inet_server_addr()::text as "serverAddress",
        inet_server_port() as "serverPort",
        version() as version
    `;
    const [migrationTable] = await sql<{ schema: string }[]>`
      select table_schema as schema
      from information_schema.tables
      where table_name = '__drizzle_migrations'
      order by table_schema
      limit 1
    `;

    console.log("Database connection OK.");
    console.log(`Host: ${parsed.hostname}`);
    console.log(`Database: ${info.database}`);
    console.log(`User: ${info.user}`);
    console.log(`Schema: ${info.schema}`);
    console.log(`Server: ${info.serverAddress ?? "unknown"}:${info.serverPort}`);
    console.log(`Drizzle migrations table: ${migrationTable ? `present (${migrationTable.schema})` : "not found"}`);
    console.log(info.version.split("\n")[0]);

    if (!parsed.hostname.includes("supabase.")) {
      console.log("Note: DATABASE_URL does not look like a Supabase cloud host. That may be intentional for local or alternate Postgres providers.");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
