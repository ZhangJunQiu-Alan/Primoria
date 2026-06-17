#!/usr/bin/env node
// Seed cross-subject prerequisite edges (from_graph_id != to_graph_id) from
// temple/cross_subject_edges.json into public.knowledge_graph_edges.
// Must run AFTER all subject graphs are seeded (FKs reference both endpoints).

import { createPgClient, crossEdgesPath, readJson, withTransaction } from "./kg-db-common.mjs";

const stripJson = (s) => s.replace(/\.json$/, "");

async function main() {
  const doc = readJson(crossEdgesPath());
  if (!Array.isArray(doc.edges)) throw new Error("cross_subject_edges.json must have an edges array");

  const client = createPgClient();
  await client.connect();
  try {
    await withTransaction(client, async () => {
      // Replace all cross-graph edges idempotently.
      await client.query(`delete from public.knowledge_graph_edges where from_graph_id <> to_graph_id`);

      for (const e of doc.edges) {
        const fromGraph = stripJson(e.from_graph);
        const toGraph = stripJson(e.to_graph);
        if (fromGraph === toGraph) throw new Error(`Not a cross edge: ${e.from} -> ${e.to}`);
        await client.query(
          `
            insert into public.knowledge_graph_edges
              (from_graph_id, from_concept_id, to_graph_id, to_concept_id, edge_type, strength, created_at, updated_at)
            values ($1, $2, $3, $4, $5, $6, now(), now())
            on conflict (from_graph_id, from_concept_id, to_graph_id, to_concept_id, edge_type) do update set
              strength = excluded.strength,
              updated_at = now()
          `,
          [fromGraph, e.from, toGraph, e.to, e.type ?? "prereq", e.strength],
        );
      }
    });
    process.stdout.write(`[db:seed:kg-cross] ${doc.edges.length} cross-subject edges\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`[db:seed:kg-cross] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
