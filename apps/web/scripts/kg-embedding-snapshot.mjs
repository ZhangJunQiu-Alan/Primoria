#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEFAULT_AUTHORIZATION_PATH,
  SNAPSHOT_SCHEMA_VERSION,
  buildEmbedTextByKey,
  buildSnapshotInventory,
  currentInputHashes,
  requireSnapshotAuthorization,
  snapshotSha256,
  verifySnapshotDirectory,
} from "./kg-embedding-snapshot-common.mjs";
import { KG_EMBEDDING_DIMENSION, createPgClient, requireEnv, withTransaction } from "./kg-db-common.mjs";

const [command, directoryArg] = process.argv.slice(2);
if (!command || !directoryArg || !["export", "verify", "import"].includes(command)) {
  throw new Error("usage: node scripts/kg-embedding-snapshot.mjs <export|verify|import> <snapshot-directory>");
}

const directory = resolve(directoryArg);
const authorizationPath = process.env.KG_EMBEDDING_SNAPSHOT_AUTHORIZATION
  ? resolve(process.env.KG_EMBEDDING_SNAPSHOT_AUTHORIZATION)
  : DEFAULT_AUTHORIZATION_PATH;

function vectorLiteral(vector) {
  return `[${vector.join(",")}]`;
}

async function exportSnapshot() {
  const authorization = requireSnapshotAuthorization(authorizationPath);
  const provider = requireEnv("KG_EMBEDDING_PROVIDER");
  const model = requireEnv("KG_EMBEDDING_MODEL");
  const modelVersion = requireEnv("KG_EMBEDDING_MODEL_VERSION");
  const fixedQueriesPath = resolve(requireEnv("KG_FIXED_QUERY_VECTORS_FILE"));
  const inventory = buildSnapshotInventory();
  const client = createPgClient();
  await client.connect();
  let rows;
  try {
    const result = await client.query(
      `select graph_id, node_id, kind, embedding::text as embedding
       from public.kg_node_embeddings
       where model_version = $1
       order by graph_id, kind, node_id`,
      [modelVersion],
    );
    rows = result.rows.map((row) => ({
      graph_id: row.graph_id,
      node_id: row.node_id,
      kind: row.kind,
      embedding: JSON.parse(row.embedding),
    }));
  } finally {
    await client.end();
  }
  if (rows.length !== inventory.counts.embeddings) {
    throw new Error(`database has ${rows.length} embeddings for ${modelVersion}; expected ${inventory.counts.embeddings}`);
  }
  mkdirSync(directory, { recursive: false });
  const payload = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  const queries = readFileSync(fixedQueriesPath, "utf8");
  const queryCount = queries.split(/\r?\n/).filter(Boolean).length;
  if (queryCount === 0) throw new Error("fixed query vector file is empty");
  writeFileSync(resolve(directory, "embeddings.jsonl"), payload, { flag: "wx" });
  writeFileSync(resolve(directory, "fixed-query-vectors.jsonl"), queries, { flag: "wx" });
  const manifest = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    snapshot_id: requireEnv("KG_EMBEDDING_SNAPSHOT_ID"),
    created_at: new Date().toISOString(),
    provider,
    model,
    model_version: modelVersion,
    dimension: KG_EMBEDDING_DIMENSION,
    authorization_decision_id: authorization.decision_id,
    counts: inventory.counts,
    input_hashes: {
      ...currentInputHashes(authorizationPath),
      node_keys_sha256: inventory.nodeKeysSha256,
    },
    payload: { file: "embeddings.jsonl", sha256: snapshotSha256(payload), bytes: Buffer.byteLength(payload) },
    fixed_queries: {
      file: "fixed-query-vectors.jsonl",
      sha256: snapshotSha256(queries),
      bytes: Buffer.byteLength(queries),
      count: queryCount,
    },
  };
  writeFileSync(resolve(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  verifySnapshotDirectory(directory, { authorizationPath });
  process.stdout.write(`[kg-embedding-snapshot] exported and verified ${manifest.snapshot_id}\n`);
}

async function verifySnapshot() {
  const { manifest, rows, queries } = verifySnapshotDirectory(directory, { authorizationPath });
  process.stdout.write(`[kg-embedding-snapshot] verified ${manifest.snapshot_id}: ${rows.length} embeddings, ${queries.length} fixed queries\n`);
}

async function importSnapshot() {
  const verified = verifySnapshotDirectory(directory, { authorizationPath });
  const embedText = buildEmbedTextByKey();
  const client = createPgClient();
  await client.connect();
  try {
    await withTransaction(client, async () => {
      await client.query("delete from public.kg_node_embeddings where model_version = $1", [verified.manifest.model_version]);
      for (const row of verified.rows) {
        const key = `${row.graph_id}\0${row.kind}\0${row.node_id}`;
        await client.query(
          `insert into public.kg_node_embeddings
            (graph_id, node_id, kind, embed_text, embedding, model_version, created_at, updated_at)
           values ($1, $2, $3, $4, $5::vector, $6, now(), now())`,
          [row.graph_id, row.node_id, row.kind, embedText.get(key), vectorLiteral(row.embedding), verified.manifest.model_version],
        );
      }
      for (const query of verified.queries) {
        const result = await client.query(
          `select graph_id, kind, node_id
           from public.kg_node_embeddings
           where model_version = $1
           order by embedding <=> $2::vector
           limit $3`,
          [verified.manifest.model_version, vectorLiteral(query.embedding), query.top_k],
        );
        const actual = new Set(result.rows.map((row) => `${row.graph_id}\0${row.kind}\0${row.node_id}`));
        const matched = query.expected.some((row) => actual.has(`${row.graph_id}\0${row.kind}\0${row.node_id}`));
        if (!matched) throw new Error(`fixed query ${query.query_id} did not retrieve any expected node in top ${query.top_k}`);
      }
    });
  } finally {
    await client.end();
  }
  process.stdout.write(`[kg-embedding-snapshot] imported ${verified.manifest.snapshot_id} and passed ${verified.queries.length} retrieval checks\n`);
}

if (command === "export") await exportSnapshot();
else if (command === "verify") await verifySnapshot();
else await importSnapshot();
