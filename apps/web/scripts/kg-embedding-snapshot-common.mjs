import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

import {
  KG_EMBEDDING_DIMENSION,
  KG_SOURCE_DIR,
  REPO_ROOT,
  WEB_ROOT,
  aliasPath,
  graphPath,
  listGraphIds,
  readJson,
} from "./kg-db-common.mjs";

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const DEFAULT_AUTHORIZATION_PATH = resolve(
  REPO_ROOT,
  "data/knowledge-graphs/governance/embedding-snapshot-authorization.json",
);
const ALLOWED_ARTIFACT_CONTENTS = [
  "fixed_query_vectors",
  "manifest",
  "model_metadata",
  "stable_node_keys",
  "vectors",
];
const ROW_KEYS = ["embedding", "graph_id", "kind", "node_id"];
const QUERY_KEYS = ["embedding", "expected", "language", "query_id", "top_k"];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashFiles(paths) {
  const hash = createHash("sha256");
  for (const path of [...paths].sort()) {
    hash.update(path.replace(`${REPO_ROOT}/`, ""));
    hash.update(readFileSync(path));
  }
  return hash.digest("hex");
}

function jsonFiles(path) {
  return readdirSync(path)
    .filter((file) => file.endsWith(".json"))
    .map((file) => resolve(path, file));
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  if (actual.join("\0") !== [...expected].sort().join("\0")) {
    throw new Error(`${label} has unexpected fields: ${actual.join(", ")}`);
  }
}

function assertSha(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a SHA-256 hex digest`);
}

function assertVector(vector, label, dimension = KG_EMBEDDING_DIMENSION) {
  if (!Array.isArray(vector) || vector.length !== dimension) {
    throw new Error(`${label} must contain exactly ${dimension} numbers`);
  }
  if (vector.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`${label} contains a non-finite vector value`);
  }
  if (!vector.some((value) => value !== 0)) throw new Error(`${label} must not be a zero vector`);
}

function parseJsonLines(path) {
  const source = readFileSync(path, "utf8");
  const rows = source.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`${basename(path)}:${index + 1} is not valid JSON`);
    }
  });
  return { rows, source };
}

function needsReviewGraphIds() {
  return listGraphIds().filter((graphId) => readJson(graphPath(graphId)).review_status === "needs_review");
}

export function requireSnapshotAuthorization(path = DEFAULT_AUTHORIZATION_PATH) {
  if (!existsSync(path)) {
    throw new Error(`snapshot publication is blocked: missing authorization decision ${path}`);
  }
  const record = readJson(path);
  const requiredStrings = ["decision_id", "approved_by_role", "approved_at", "external_evidence_reference"];
  for (const field of requiredStrings) {
    if (typeof record[field] !== "string" || record[field].trim().length < 3) {
      throw new Error(`snapshot authorization ${field} is required`);
    }
  }
  if (record.status !== "approved") throw new Error("snapshot authorization status must be approved");
  if (!Number.isFinite(Date.parse(record.approved_at))) throw new Error("snapshot authorization approved_at must be a valid date");
  if (!/^https:\/\/|^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(record.external_evidence_reference)) {
    throw new Error("snapshot authorization external_evidence_reference must be an external URI");
  }
  const expectedGraphs = needsReviewGraphIds();
  const coveredGraphs = Array.isArray(record.covered_graph_ids) ? [...record.covered_graph_ids].sort() : [];
  if (coveredGraphs.join("\0") !== expectedGraphs.join("\0")) {
    throw new Error(`snapshot authorization must cover exactly: ${expectedGraphs.join(", ")}`);
  }
  const contents = Array.isArray(record.allowed_artifact_contents) ? [...record.allowed_artifact_contents].sort() : [];
  if (contents.join("\0") !== ALLOWED_ARTIFACT_CONTENTS.join("\0")) {
    throw new Error(`snapshot authorization allowed_artifact_contents must be: ${ALLOWED_ARTIFACT_CONTENTS.join(", ")}`);
  }
  return record;
}

export function buildSnapshotInventory() {
  const graphIds = listGraphIds();
  const nodes = [];
  let topics = 0;
  let concepts = 0;
  let edges = 0;
  for (const graphId of graphIds) {
    const graph = readJson(graphPath(graphId));
    edges += Array.isArray(graph.edges) ? graph.edges.length : 0;
    for (const node of graph.nodes) {
      if (node.kind !== "topic" && node.kind !== "concept") continue;
      if (node.kind === "topic") topics += 1;
      else concepts += 1;
      nodes.push({ graph_id: graphId, kind: node.kind, node_id: node.id });
    }
  }
  nodes.sort((left, right) => `${left.graph_id}\0${left.kind}\0${left.node_id}`.localeCompare(`${right.graph_id}\0${right.kind}\0${right.node_id}`));
  const nodeKeys = nodes.map((node) => `${node.graph_id}\t${node.kind}\t${node.node_id}`).join("\n") + "\n";
  return {
    graphIds,
    nodes,
    counts: { graphs: graphIds.length, topics, concepts, edges, embeddings: nodes.length },
    nodeKeysSha256: sha256(nodeKeys),
  };
}

export function currentInputHashes(authorizationPath = DEFAULT_AUTHORIZATION_PATH) {
  const aliasFiles = readdirSync(resolve(WEB_ROOT, "src/lib/knowledge-graph/data"))
    .filter((file) => file.startsWith("node-aliases.") && file.endsWith(".json"))
    .map((file) => resolve(WEB_ROOT, "src/lib/knowledge-graph/data", file));
  const labelPath = resolve(KG_SOURCE_DIR, "kg_zh_labels.json");
  const sourceFiles = jsonFiles(KG_SOURCE_DIR).filter((path) => path !== labelPath);
  const generatorFiles = [
    resolve(WEB_ROOT, "scripts/kg-db-common.mjs"),
    resolve(WEB_ROOT, "scripts/seed-kg-embeddings.mjs"),
    resolve(WEB_ROOT, "scripts/kg-embedding-snapshot-common.mjs"),
    resolve(WEB_ROOT, "scripts/kg-embedding-snapshot.mjs"),
  ];
  return {
    kg_source_sha256: hashFiles(sourceFiles),
    labels_sha256: hashFiles([labelPath]),
    aliases_sha256: hashFiles(aliasFiles),
    generator_sha256: hashFiles(generatorFiles),
    governance_decision_sha256: hashFiles([authorizationPath]),
  };
}

export function buildEmbedTextByKey() {
  const zhPath = resolve(KG_SOURCE_DIR, "kg_zh_labels.json");
  const zhLabels = existsSync(zhPath) ? readJson(zhPath).labels ?? {} : {};
  const result = new Map();
  for (const graphId of listGraphIds()) {
    const graph = readJson(graphPath(graphId));
    const aliasesPath = aliasPath(graphId);
    const aliases = existsSync(aliasesPath) ? readJson(aliasesPath).aliases ?? {} : {};
    const topics = new Map(graph.nodes.filter((node) => node.kind === "topic").map((node) => [node.id, node]));
    for (const node of graph.nodes) {
      if (node.kind !== "topic" && node.kind !== "concept") continue;
      const names = [zhLabels[node.id], ...(aliases[node.id] ?? [])].filter(Boolean);
      const aliasText = names.length ? `别名: ${names.join(", ")}` : null;
      const parts = node.kind === "topic"
        ? ["topic", node.name, graph.subject, aliasText]
        : ["concept", node.name, graph.subject, node.description, `属: ${topics.get(node.topic)?.name}`, aliasText];
      result.set(`${graphId}\0${node.kind}\0${node.id}`, parts.filter(Boolean).join(" / "));
    }
  }
  return result;
}

export function verifySnapshotDirectory(directory, options = {}) {
  const manifestPath = resolve(directory, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`missing snapshot manifest: ${manifestPath}`);
  const manifest = readJson(manifestPath);
  if (manifest.schema_version !== SNAPSHOT_SCHEMA_VERSION) throw new Error(`unsupported snapshot schema_version: ${manifest.schema_version}`);
  if (!manifest.snapshot_id || !manifest.created_at) throw new Error("snapshot_id and created_at are required");
  if (!manifest.provider || !manifest.model || !manifest.model_version) throw new Error("provider, model, and model_version are required");
  if (manifest.dimension !== KG_EMBEDDING_DIMENSION) throw new Error(`snapshot dimension must be ${KG_EMBEDDING_DIMENSION}`);

  const authorizationPath = options.authorizationPath ?? DEFAULT_AUTHORIZATION_PATH;
  const authorization = requireSnapshotAuthorization(authorizationPath);
  const inventory = buildSnapshotInventory();
  const expectedHashes = currentInputHashes(authorizationPath);
  for (const [field, expected] of Object.entries(expectedHashes)) {
    assertSha(manifest.input_hashes?.[field], `input_hashes.${field}`);
    if (manifest.input_hashes[field] !== expected) throw new Error(`snapshot input hash is stale: ${field}`);
  }
  if (manifest.input_hashes?.node_keys_sha256 !== inventory.nodeKeysSha256) throw new Error("snapshot stable node-key set is stale");
  if (JSON.stringify(manifest.counts) !== JSON.stringify(inventory.counts)) throw new Error("snapshot inventory counts do not match current KG sources");
  if (manifest.authorization_decision_id !== authorization.decision_id) throw new Error("snapshot authorization decision id mismatch");

  const payloadPath = resolve(directory, manifest.payload?.file ?? "");
  if (manifest.payload?.file !== "embeddings.jsonl" || !existsSync(payloadPath)) throw new Error("snapshot payload must be embeddings.jsonl");
  const payload = parseJsonLines(payloadPath);
  assertSha(manifest.payload.sha256, "payload.sha256");
  if (sha256(payload.source) !== manifest.payload.sha256 || statSync(payloadPath).size !== manifest.payload.bytes) {
    throw new Error("snapshot embedding payload checksum or byte count mismatch");
  }
  const expectedKeys = new Set(inventory.nodes.map((node) => `${node.graph_id}\0${node.kind}\0${node.node_id}`));
  const actualKeys = new Set();
  for (const [index, row] of payload.rows.entries()) {
    assertExactKeys(row, ROW_KEYS, `embeddings.jsonl:${index + 1}`);
    assertVector(row.embedding, `embeddings.jsonl:${index + 1}.embedding`, manifest.dimension);
    const key = `${row.graph_id}\0${row.kind}\0${row.node_id}`;
    if (!expectedKeys.has(key)) throw new Error(`snapshot contains unknown node key: ${key}`);
    if (actualKeys.has(key)) throw new Error(`snapshot contains duplicate node key: ${key}`);
    actualKeys.add(key);
  }
  if (actualKeys.size !== expectedKeys.size) throw new Error(`snapshot has ${actualKeys.size} embeddings; expected ${expectedKeys.size}`);

  const queryPath = resolve(directory, manifest.fixed_queries?.file ?? "");
  if (manifest.fixed_queries?.file !== "fixed-query-vectors.jsonl" || !existsSync(queryPath)) throw new Error("snapshot fixed query payload is required");
  const queries = parseJsonLines(queryPath);
  assertSha(manifest.fixed_queries.sha256, "fixed_queries.sha256");
  if (sha256(queries.source) !== manifest.fixed_queries.sha256 || statSync(queryPath).size !== manifest.fixed_queries.bytes) {
    throw new Error("fixed query payload checksum or byte count mismatch");
  }
  if (queries.rows.length !== manifest.fixed_queries.count || queries.rows.length === 0) throw new Error("fixed query count mismatch");
  const queryIds = new Set();
  for (const [index, query] of queries.rows.entries()) {
    assertExactKeys(query, QUERY_KEYS, `fixed-query-vectors.jsonl:${index + 1}`);
    assertVector(query.embedding, `fixed-query-vectors.jsonl:${index + 1}.embedding`, manifest.dimension);
    if (!query.query_id || queryIds.has(query.query_id)) throw new Error(`fixed query id is missing or duplicated at line ${index + 1}`);
    queryIds.add(query.query_id);
    if (!Number.isInteger(query.top_k) || query.top_k < 1 || query.top_k > 20) throw new Error(`invalid top_k for query ${query.query_id}`);
    if (!Array.isArray(query.expected) || query.expected.length === 0) throw new Error(`query ${query.query_id} must declare expected node keys`);
    for (const expected of query.expected) {
      assertExactKeys(expected, ["graph_id", "kind", "node_id"], `query ${query.query_id} expected node`);
      const key = `${expected.graph_id}\0${expected.kind}\0${expected.node_id}`;
      if (!expectedKeys.has(key)) throw new Error(`query ${query.query_id} expects unknown node key: ${key}`);
    }
  }
  return { manifest, rows: payload.rows, queries: queries.rows, inventory };
}

export function snapshotSha256(value) {
  return sha256(value);
}
