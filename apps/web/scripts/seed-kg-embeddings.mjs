#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEFAULT_GRAPH_ID,
  DEFAULT_MINIMAX_EMBEDDING_MODEL,
  DEFAULT_MINIMAX_MODEL_VERSION,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  DEFAULT_OPENAI_MODEL_VERSION,
  KG_EMBEDDING_DIMENSION,
  REPO_ROOT,
  aliasPath,
  createPgClient,
  graphPath,
  listGraphIds,
  readJson,
  requireEnv,
  withTransaction,
} from "./kg-db-common.mjs";

const arg = process.argv[2] || DEFAULT_GRAPH_ID;

function getEmbeddingProvider() {
  const provider = process.env.KG_EMBEDDING_PROVIDER || "openai-compatible";
  if (provider === "openai" || provider === "openai-compatible") return "openai-compatible";
  if (provider === "minimax") return "minimax";
  throw new Error(`Unsupported KG_EMBEDDING_PROVIDER: ${provider}`);
}

function getDefaultModelVersion() {
  return getEmbeddingProvider() === "minimax" ? DEFAULT_MINIMAX_MODEL_VERSION : DEFAULT_OPENAI_MODEL_VERSION;
}

function assertEmbeddingDimension(embedding) {
  if (!Array.isArray(embedding) || embedding.length !== KG_EMBEDDING_DIMENSION) {
    throw new Error(`Unexpected embedding dimension: ${embedding?.length ?? 0}`);
  }
}

// Global node_id -> Chinese label map (data/knowledge-graphs/source/kg_zh_labels.json), used as an
// alias so Chinese queries match English nodes in recall.
function loadZhLabels() {
  const path = resolve(REPO_ROOT, "data/knowledge-graphs/source/kg_zh_labels.json");
  if (!existsSync(path)) return {};
  return readJson(path).labels ?? {};
}

// Optional per-graph alias sidecar (most graphs have none).
function loadGraphAliases(graphId) {
  const path = aliasPath(graphId);
  if (!existsSync(path)) return {};
  const data = readJson(path);
  if (data.graphId && data.graphId !== graphId) throw new Error(`Alias graphId mismatch: ${data.graphId}`);
  return data.aliases ?? {};
}

function aliasesFor(graphAliases, zhLabels, nodeId) {
  const out = [];
  if (zhLabels[nodeId]) out.push(zhLabels[nodeId]);
  const extra = graphAliases[nodeId] ?? [];
  if (!Array.isArray(extra)) throw new Error(`Alias entry for ${nodeId} must be an array`);
  for (const a of extra) if (a) out.push(a);
  return out;
}

function buildEmbedText(graph, topicById, graphAliases, zhLabels, node) {
  const aliases = aliasesFor(graphAliases, zhLabels, node.id);
  const aliasText = aliases.length > 0 ? `别名: ${aliases.join(", ")}` : null;

  if (node.kind === "topic") {
    return ["topic", node.name, graph.subject, aliasText].filter(Boolean).join(" / ");
  }

  const topic = topicById.get(node.topic);
  if (!topic) throw new Error(`Concept ${node.id} references missing topic ${node.topic}`);
  return ["concept", node.name, graph.subject, node.description, `属: ${topic.name}`, aliasText]
    .filter(Boolean)
    .join(" / ");
}

async function createOpenAiCompatibleEmbeddings(inputs) {
  const baseUrl = (process.env.KG_EMBEDDING_BASE_URL || process.env.OPENAI_BASE_URL)?.replace(/\/$/, "");
  const apiKey = process.env.KG_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_EMBEDDING_MODEL;
  if (!baseUrl) throw new Error("Missing KG_EMBEDDING_BASE_URL or OPENAI_BASE_URL");
  if (!apiKey) throw new Error("Missing KG_EMBEDDING_API_KEY or OPENAI_API_KEY");
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
      assertEmbeddingDimension(item.embedding);
      embeddings.push(item.embedding);
    }
  }

  return embeddings;
}

async function createMiniMaxEmbeddings(inputs) {
  const baseUrl = (process.env.MINIMAX_EMBEDDING_BASE_URL || process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1")
    .replace(/\/$/, "");
  const apiKey = requireEnv("MINIMAX_API_KEY");
  const model = process.env.MINIMAX_EMBEDDING_MODEL || DEFAULT_MINIMAX_EMBEDDING_MODEL;
  const groupId = process.env.MINIMAX_GROUP_ID;
  const batches = [];

  for (let i = 0; i < inputs.length; i += 64) batches.push(inputs.slice(i, i + 64));

  const embeddings = [];
  for (const batch of batches) {
    const url = new URL(`${baseUrl}/embeddings`);
    if (groupId) url.searchParams.set("GroupId", groupId);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, texts: batch, type: "db" }),
    });
    const json = await response.json().catch(() => ({}));
    const statusCode = json.base_resp?.status_code;
    if (!response.ok || (statusCode !== undefined && statusCode !== 0)) {
      throw new Error(json.error?.message ?? json.base_resp?.status_msg ?? `Embedding request failed: ${response.status}`);
    }

    const vectors = json.vectors;
    if (!Array.isArray(vectors) || vectors.length !== batch.length) {
      throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${vectors?.length ?? 0}`);
    }
    for (const embedding of vectors) {
      assertEmbeddingDimension(embedding);
      embeddings.push(embedding);
    }
  }

  return embeddings;
}

async function createEmbeddings(inputs) {
  return getEmbeddingProvider() === "minimax"
    ? createMiniMaxEmbeddings(inputs)
    : createOpenAiCompatibleEmbeddings(inputs);
}

function vectorLiteral(embedding) {
  return `[${embedding.join(",")}]`;
}

async function embedGraph(client, graphId, zhLabels) {
  const graph = readJson(graphPath(graphId));
  const graphAliases = loadGraphAliases(graphId);

  const nodes = graph.nodes.filter((node) => node.kind === "topic" || node.kind === "concept");
  const topicById = new Map(graph.nodes.filter((node) => node.kind === "topic").map((topic) => [topic.id, topic]));
  const rows = nodes.map((node) => ({
    graphId,
    nodeId: node.id,
    kind: node.kind,
    embedText: buildEmbedText(graph, topicById, graphAliases, zhLabels, node),
  }));

  const modelVersion = process.env.KG_EMBEDDING_MODEL_VERSION || getDefaultModelVersion();
  const embeddings = await createEmbeddings(rows.map((row) => row.embedText));
  rows.forEach((row, index) => {
    row.embedding = embeddings[index];
  });

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

  process.stdout.write(`[db:seed:kg-embeddings] ${graphId}: ${rows.length} embeddings\n`);
}

async function main() {
  const ids = arg === "all" ? listGraphIds() : [arg];
  const zhLabels = loadZhLabels();
  const client = createPgClient();
  await client.connect();
  try {
    for (const id of ids) await embedGraph(client, id, zhLabels);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`[db:seed:kg-embeddings] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
