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

export function getDb() {
  const url = getDatabaseUrl();
  const existing = globalAny[globalKey];
  if (existing?.db) return existing.db;

  const client = postgres(url, {
    max: getDatabasePoolMax(),
    prepare: false,
  });
  const db = drizzle(client, { schema });
  globalAny[globalKey] = { client, db };
  return db;
}
