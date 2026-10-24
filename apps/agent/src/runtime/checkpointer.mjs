import pg from "pg";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

/**
 * Supabase's session pooler (port 5432 on *.pooler.supabase.com) caps client
 * connections per role; the transaction pooler (6543), direct and local
 * databases do not. Mirrors apps/web/src/lib/db/client.ts.
 * @param {string} databaseUrl
 */
export function isSupabaseSessionPooler(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return url.hostname.endsWith(".pooler.supabase.com") && (url.port || "5432") === "5432";
  } catch {
    return false;
  }
}

/** @param {string} [databaseUrl] */
export function getAgentDatabasePoolMax(databaseUrl = process.env.DATABASE_URL ?? "") {
  const raw = process.env.AGENT_DATABASE_POOL_MAX || process.env.DATABASE_POOL_MAX || "";
  const configured = Number(raw);
  if (raw && Number.isInteger(configured) && configured > 0) return Math.min(configured, 20);
  // Each run holds the checkpointer briefly per step; size for AGENT_RUN_CONCURRENCY.
  return isSupabaseSessionPooler(databaseUrl) ? 1 : 4;
}

/** @param {string} databaseUrl */
export function createAgentCheckpointer(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: getAgentDatabasePoolMax(databaseUrl), connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
  pool.on("error", (error) => console.error("[agent-runtime] idle database connection failed", { message: error.message }));
  return new PostgresSaver(pool, undefined, { schema: "agent_runtime" });
}
