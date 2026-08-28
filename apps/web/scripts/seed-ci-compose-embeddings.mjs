#!/usr/bin/env node

import { createPgClient, KG_EMBEDDING_DIMENSION, requireEnv, withTransaction } from "./kg-db-common.mjs";

if (process.env.CI_COMPOSE_SMOKE !== "1") throw new Error("CI_COMPOSE_SMOKE=1 is required");
const databaseUrl = new URL(requireEnv("DATABASE_URL"));
if (databaseUrl.hostname !== "postgres") throw new Error("CI Compose embedding seed must target the isolated postgres service");
const modelVersion = requireEnv("KG_EMBEDDING_MODEL_VERSION");
if (!modelVersion.startsWith("ci:")) throw new Error("CI Compose embedding model version must use the ci: namespace");

const vector = `[${Array.from({ length: KG_EMBEDDING_DIMENSION }, () => "0").join(",")}]`;
const client = createPgClient();
await client.connect();
try {
  await withTransaction(client, async () => {
    await client.query("delete from public.kg_node_embeddings where model_version = $1", [modelVersion]);
    await client.query(
      `insert into public.kg_node_embeddings
        (graph_id, node_id, kind, embed_text, embedding, model_version, created_at, updated_at)
       select graph_id, id, 'topic', 'ci-compose-smoke', $1::vector, $2, now(), now()
       from public.knowledge_graph_topics`,
      [vector, modelVersion],
    );
    await client.query(
      `insert into public.kg_node_embeddings
        (graph_id, node_id, kind, embed_text, embedding, model_version, created_at, updated_at)
       select graph_id, id, 'concept', 'ci-compose-smoke', $1::vector, $2, now(), now()
       from public.knowledge_graph_concepts`,
      [vector, modelVersion],
    );
  });
  const result = await client.query(
    "select count(*)::int as count, count(distinct graph_id)::int as graphs from public.kg_node_embeddings where model_version = $1",
    [modelVersion],
  );
  if (result.rows[0]?.graphs !== 31 || result.rows[0]?.count !== 2035) {
    throw new Error(`unexpected CI embedding inventory: ${JSON.stringify(result.rows[0])}`);
  }
  process.stdout.write(`[seed-ci-compose-embeddings] ${result.rows[0].graphs} graphs, ${result.rows[0].count} nodes\n`);
} finally {
  await client.end();
}
