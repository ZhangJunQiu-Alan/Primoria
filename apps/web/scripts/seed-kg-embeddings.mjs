#!/usr/bin/env node

import {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_GRAPH_ID,
  DEFAULT_MODEL_VERSION,
  aliasPath,
  createPgClient,
  graphPath,
  readJson,
  requireEnv,
  withTransaction,
} from "./kg-db-common.mjs";

const graphId = process.argv[2] || DEFAULT_GRAPH_ID;
const EMBEDDING_DIMENSION = 1536;

function aliasesFor(aliasData, nodeId) {
  const aliases = aliasData.aliases?.[nodeId] ?? [];
  if (!Array.isArray(aliases)) throw new Error(`Alias entry for ${nodeId} must be an array`);
  return aliases.filter(Boolean);
}

function buildEmbedText(graph, topicById, aliasData, node) {
  const aliases = aliasesFor(aliasData, node.id);
  const aliasText = aliases.length > 0 ? `别名: ${aliases.join(", ")}` : null;

  if (node.kind === "topic") {
    return ["topic", node.name, graph.subject, aliasText].filter(Boolean).join(" / ");
  }

  const topic = topicById.get(node.topic);
  if (!topic) throw new Error(`Concept ${node.id} references missing topic ${node.topic}`);
  return ["concept", node.name, node.description, `属: ${topic.name}`, aliasText].filter(Boolean).join(" / ");
}

async function createEmbeddings(inputs) {
  const baseUrl = requireEnv("OPENAI_BASE_URL").replace(/\/$/, "");
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const batches = [];

  for (let i = 0; i < inputs.length; i += 64) batches.push(inputs.slice(i, i + 64));

  const embeddings = [];
  for (const batch of batches) {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: batch }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error?.message ?? `Embedding request failed: ${response.status}`);
    }
    const data = json.data;
    if (!Array.isArray(data) || data.length !== batch.length) {
      throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${data?.length ?? 0}`);
    }
    for (const item of data.sort((a, b) => a.index - b.index)) {
      if (!Array.isArray(item.embedding) || item.embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error(`Unexpected embedding dimension: ${item.embedding?.length ?? 0}`);
      }
      embeddings.push(item.embedding);
    }
  }

  return embeddings;
}

function vectorLiteral(embedding) {
  return `[${embedding.join(",")}]`;
}

async function main() {
  const graph = readJson(graphPath(graphId));
  const aliasData = readJson(aliasPath(graphId));
  if (aliasData.graphId !== graphId) throw new Error(`Alias graphId mismatch: ${aliasData.graphId}`);

  const nodes = graph.nodes.filter((node) => node.kind === "topic" || node.kind === "concept");
  const topicById = new Map(graph.nodes.filter((node) => node.kind === "topic").map((topic) => [topic.id, topic]));
  const rows = nodes.map((node) => ({
    graphId,
    nodeId: node.id,
    kind: node.kind,
    embedText: buildEmbedText(graph, topicById, aliasData, node),
  }));

  const modelVersion = process.env.KG_EMBEDDING_MODEL_VERSION || DEFAULT_MODEL_VERSION;
  const embeddings = await createEmbeddings(rows.map((row) => row.embedText));
  rows.forEach((row, index) => {
    row.embedding = embeddings[index];
  });

  const client = createPgClient();
  await client.connect();
  try {
    await withTransaction(client, async () => {
      await client.query(
        `
          create temporary table kg_embedding_seed_nodes (
            kind text not null,
            node_id text not null
          ) on commit drop
        `,
      );

      for (const row of rows) {
        await client.query("insert into kg_embedding_seed_nodes (kind, node_id) values ($1, $2)", [
          row.kind,
          row.nodeId,
        ]);
        await client.query(
          `
            insert into public.kg_node_embeddings
              (graph_id, node_id, kind, embed_text, embedding, model_version, created_at, updated_at)
            values ($1, $2, $3, $4, $5::vector, $6, now(), now())
            on conflict (graph_id, kind, node_id, model_version) do update set
              embed_text = excluded.embed_text,
              embedding = excluded.embedding,
              updated_at = now()
          `,
          [row.graphId, row.nodeId, row.kind, row.embedText, vectorLiteral(row.embedding), modelVersion],
        );
      }

      await client.query(
        `
          delete from public.kg_node_embeddings e
          where e.graph_id = $1
            and e.model_version = $2
            and not exists (
              select 1
              from kg_embedding_seed_nodes s
              where s.kind = e.kind and s.node_id = e.node_id
            )
        `,
        [graphId, modelVersion],
      );
    });

    process.stdout.write(`[db:seed:kg-embeddings] ${graphId}: ${rows.length} embeddings (${modelVersion})\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`[db:seed:kg-embeddings] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
