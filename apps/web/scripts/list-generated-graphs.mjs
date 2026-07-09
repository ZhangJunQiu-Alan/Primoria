#!/usr/bin/env node

// 沉淀机制 review tooling for generated_topic_graphs.
//
//   node scripts/list-generated-graphs.mjs            # candidates ranked by demand
//   node scripts/list-generated-graphs.mjs <graphId>  # export one graph JSON to temple/generated/
//
// Promotion path: review the exported JSON, convert it into a temple/*.json
// subject graph (build-topic-graph.mjs input), run the normal seed + embedding
// pipeline, then set status='promoted' on the row so routing prefers the
// formal library copy.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { REPO_ROOT, createPgClient, loadLocalEnv } from "./kg-db-common.mjs";

loadLocalEnv();

const arg = process.argv[2];

async function main() {
  const client = createPgClient();
  await client.connect();
  try {
    if (!arg) {
      const { rows } = await client.query(
        `select graph_id, subject, topic, status, usage_count, created_at::date as created
         from public.generated_topic_graphs
         order by status = 'candidate' desc, usage_count desc, created_at asc
         limit 50`,
      );
      if (rows.length === 0) {
        process.stdout.write("no generated graphs yet\n");
        return;
      }
      for (const row of rows) {
        process.stdout.write(
          `${String(row.usage_count).padStart(4)}x  [${row.status}]  ${row.graph_id}  ${row.subject}  (topic: ${row.topic})\n`,
        );
      }
      return;
    }

    const { rows } = await client.query(
      "select graph_id, graph from public.generated_topic_graphs where graph_id = $1",
      [arg],
    );
    if (rows.length === 0) throw new Error(`generated graph not found: ${arg}`);
    const dir = resolve(REPO_ROOT, "temple/generated");
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, `topic-graph.${arg}.json`);
    writeFileSync(path, `${JSON.stringify(rows[0].graph, null, 2)}\n`);
    process.stdout.write(`exported ${arg} -> ${path}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`[list-generated-graphs] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
