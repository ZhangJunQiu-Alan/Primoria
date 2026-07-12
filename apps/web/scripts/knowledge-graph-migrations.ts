import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { getDatabaseSsl } from "../src/lib/db/ssl";

const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../db/knowledge-graph/migrations",
);
const MIGRATION_NAME_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/;
const ADVISORY_LOCK_NAME = "primoria:knowledge-graph-schema-migrations";

type AppliedMigration = {
  name: string;
  checksum: string;
};

function migrationFiles() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => {
      if (!MIGRATION_NAME_PATTERN.test(name)) {
        throw new Error(`Invalid KG migration filename: ${name}`);
      }
      const sql = readFileSync(resolve(MIGRATIONS_DIR, name), "utf8");
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  if (files.length === 0) throw new Error(`No KG migrations found in ${MIGRATIONS_DIR}`);
  return files;
}

export async function runKnowledgeGraphMigrations() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

  const ssl = getDatabaseSsl();
  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ...(ssl !== undefined ? { ssl } : {}),
  });

  try {
    await client`select pg_advisory_lock(hashtext(${ADVISORY_LOCK_NAME}))`;
    await client.unsafe(`
      create table if not exists public.primoria_kg_schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const appliedRows = await client<AppliedMigration[]>`
      select name, checksum
      from public.primoria_kg_schema_migrations
    `;
    const applied = new Map(appliedRows.map((row) => [row.name, row.checksum]));

    for (const migration of migrationFiles()) {
      const previousChecksum = applied.get(migration.name);
      if (previousChecksum) {
        if (previousChecksum !== migration.checksum) {
          throw new Error(`KG migration checksum mismatch: ${migration.name}`);
        }
        console.log(`[db:migrate:kg] already applied ${migration.name}`);
        continue;
      }

      await client.begin(async (transaction) => {
        await transaction.unsafe(migration.sql);
        await transaction`
          insert into public.primoria_kg_schema_migrations (name, checksum)
          values (${migration.name}, ${migration.checksum})
        `;
      });
      console.log(`[db:migrate:kg] applied ${migration.name}`);
    }
  } finally {
    await client`select pg_advisory_unlock(hashtext(${ADVISORY_LOCK_NAME}))`.catch(() => []);
    await client.end({ timeout: 5 });
  }
}
