import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbGlobal = {
  client?: postgres.Sql;
  db?: PostgresJsDatabase<typeof schema>;
};

const globalKey = "__primoria_postgres__";
const globalAny = globalThis as unknown as Record<string, DbGlobal | undefined>;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return url;
}

function getDatabasePoolMax() {
  const configured = Number(process.env.DATABASE_POOL_MAX ?? "");
  if (Number.isFinite(configured) && configured > 0) return Math.min(Math.floor(configured), 20);
  return 5;
}

function getDatabaseConnectTimeout() {
  const configured = Number(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS ?? "");
  if (Number.isFinite(configured) && configured > 0) return Math.min(Math.floor(configured), 30);
  return 5;
}

export function getDb() {
  const url = getDatabaseUrl();
  const existing = globalAny[globalKey];
  if (existing?.db) return existing.db;

  const client = postgres(url, {
    max: getDatabasePoolMax(),
    connect_timeout: getDatabaseConnectTimeout(),
    prepare: false,
  });
  const db = drizzle(client, { schema });
  globalAny[globalKey] = { client, db };
  return db;
}

// The Drizzle handle and a transaction handle share the same query API; helpers
// that must run inside or outside a transaction accept `DbOrTx`.
export type Db = ReturnType<typeof getDb>;
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | DbTransaction;

export async function closeDb(): Promise<void> {
  const existing = globalAny[globalKey];

  // Clear the cached handles before closing so a later getDb() call cannot
  // reuse a client that is already shutting down.
  delete globalAny[globalKey];

  if (existing?.client) {
    await existing.client.end({ timeout: 5 });
  }
}
