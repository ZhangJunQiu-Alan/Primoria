import pg from "pg";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

export function getAgentDatabasePoolMax() {
  const configured = Number(process.env.AGENT_DATABASE_POOL_MAX ?? process.env.DATABASE_POOL_MAX ?? "");
  return Number.isInteger(configured) && configured > 0 ? Math.min(configured, 20) : 1;
}

/** @param {string} databaseUrl */
export function createAgentCheckpointer(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: getAgentDatabasePoolMax(), connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
  pool.on("error", (error) => console.error("[agent-runtime] idle database connection failed", { message: error.message }));
  return new PostgresSaver(pool, undefined, { schema: "agent_runtime" });
}
