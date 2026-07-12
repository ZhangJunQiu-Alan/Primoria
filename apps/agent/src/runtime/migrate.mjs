import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(runtimeDir, "../../db/migrations");

export async function migrateAgentRuntime(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Agent runtime migrations");
  const sql = postgres(databaseUrl, { prepare: false, onnotice: () => {} });
  try {
    await sql`create schema if not exists agent_runtime`;
    await sql`create table if not exists agent_runtime.schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )`;

    const names = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
    for (const name of names) {
      const body = await readFile(path.join(migrationsDir, name), "utf8");
      const checksum = createHash("sha256").update(body).digest("hex");
      const rows = await sql`select checksum from agent_runtime.schema_migrations where name = ${name}`;
      if (rows[0]) {
        if (rows[0].checksum !== checksum) throw new Error(`Agent runtime migration checksum mismatch: ${name}`);
        continue;
      }
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into agent_runtime.schema_migrations (name, checksum) values (${name}, ${checksum})`;
      });
      process.stdout.write(`[agent:migrate] applied ${name}\n`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateAgentRuntime().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
