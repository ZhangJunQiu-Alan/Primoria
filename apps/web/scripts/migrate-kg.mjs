#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { REPO_ROOT, createPgClient, withTransaction } from "./kg-db-common.mjs";

const MIGRATION = resolve(REPO_ROOT, "supabase/migrations/20260615_knowledge_graph_core.sql");

async function main() {
  const sql = readFileSync(MIGRATION, "utf8");
  const client = createPgClient();
  await client.connect();
  try {
    await withTransaction(client, () => client.query(sql));
    process.stdout.write(`[db:migrate:kg] applied ${MIGRATION}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`[db:migrate:kg] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
