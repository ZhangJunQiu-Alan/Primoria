#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { KG_SOURCE_DIR, REPO_ROOT, graphPath, listGraphIds, readJson } from "./kg-db-common.mjs";

const TODAY = "2026-07-17";
const GOVERNANCE_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/governance");
const CONCEPT_REGISTRY_PATH = resolve(GOVERNANCE_DIR, "concept-registry.json");
const CROSS_EDGES_PATH = resolve(KG_SOURCE_DIR, "cross_subject_edges.json");

const VERIFIED_SOURCE_IDS = {
  a_level_biology: ["src_cambridge_9700_2025_2027"],
  a_level_chemistry: ["src_cambridge_9701_2025_2027"],
  a_level_mathematics: ["src_cambridge_9709_2026_2027", "src_cambridge_9709_2026_2027_update"],
  a_level_physics: ["src_cambridge_9702_2025_2027"],
  mit_calculus: ["src_mit_ocw_18_01sc_fall_2010"],
};

const VERIFIED_JURISDICTIONS = {
  a_level_biology: ["international"],
  a_level_chemistry: ["international"],
  a_level_mathematics: ["international"],
  a_level_physics: ["international"],
  mit_calculus: ["US"],
};

function bootstrapCanonicalId(graphId, nodeId) {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${graphId}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
}

function migrateNode(graphId, node) {
  const {
    id,
    kind,
    name,
    name_zh: nameZh,
    topic,
    description,
    default_order: defaultOrder,
    canonical_id: existingCanonicalId,
    evidence_refs: existingEvidenceRefs,
    review_status: existingReviewStatus,
    ...extra
  } = node;

  return {
    id,
    ...(kind === "concept"
      ? { canonical_id: existingCanonicalId ?? bootstrapCanonicalId(graphId, id) }
      : {}),
    kind,
    name,
    name_zh: nameZh,
    topic,
    ...(kind === "concept" ? { description } : {}),
    default_order: defaultOrder,
    ...extra,
    evidence_refs: existingEvidenceRefs ?? [],
    review_status: existingReviewStatus ?? "unreviewed",
  };
}

function migrateEdge(edge) {
  const {
    weight: _legacyWeight,
    evidence_refs: existingEvidenceRefs,
    review_status: existingReviewStatus,
    ...rest
  } = edge;
  return {
    ...rest,
    evidence_refs: existingEvidenceRefs ?? [],
    review_status: existingReviewStatus ?? "unreviewed",
  };
}

function sourceIdsFor(graphId) {
  return VERIFIED_SOURCE_IDS[graphId] ?? [`src_unverified_${graphId}`];
}

function migrateGraph(graphId) {
  const graph = readJson(graphPath(graphId));
  const { schema: _legacySchema, ...withoutLegacySchema } = graph;
  return {
    schema_version: "2.0.0",
    content_version: graph.content_version ?? "1.0.0",
    graph_id: graphId,
    subject: graph.subject,
    jurisdictions: VERIFIED_JURISDICTIONS[graphId] ?? [],
    source_ids: sourceIdsFor(graphId),
    review_status: graph.review_status ?? "unreviewed",
    changelog: graph.changelog ?? [
      {
        version: "1.0.0",
        date: TODAY,
        summary_zh: "建立来源、版本、许可证、审核状态和稳定概念 ID 基线。",
      },
    ],
    nodes: withoutLegacySchema.nodes.map((node) => migrateNode(graphId, node)),
    edges: withoutLegacySchema.edges.map(migrateEdge),
  };
}

function buildConceptRegistry(graphs) {
  const byCanonicalId = new Map();
  for (const graph of graphs) {
    for (const node of graph.nodes) {
      if (node.kind !== "concept") continue;
      const existing = byCanonicalId.get(node.canonical_id);
      const alias = { graph_id: graph.graph_id, node_id: node.id };
      if (existing) {
        existing.aliases.push(alias);
        continue;
      }
      byCanonicalId.set(node.canonical_id, {
        canonical_id: node.canonical_id,
        preferred_name: node.name,
        preferred_name_zh: node.name_zh,
        status: "active",
        review_status: node.review_status,
        aliases: [alias],
      });
    }
  }
  return {
    schema_version: "1.0.0",
    generated_at: TODAY,
    concepts: [...byCanonicalId.values()].sort((a, b) => a.canonical_id.localeCompare(b.canonical_id)),
    redirects: [],
  };
}

function migrateCrossSubjectEdges() {
  const current = readJson(CROSS_EDGES_PATH);
  return {
    schema_version: "2.0.0",
    content_version: current.content_version ?? "1.0.0",
    description: current.description,
    source_ids: ["src_unverified_cross_subject_prerequisites"],
    review_status: current.review_status ?? "unreviewed",
    changelog: current.changelog ?? [
      {
        version: "1.0.0",
        date: TODAY,
        summary_zh: "建立跨学科先修边的来源与审核基线。",
      },
    ],
    edges: current.edges.map(migrateEdge),
  };
}

mkdirSync(KG_SOURCE_DIR, { recursive: true });
mkdirSync(GOVERNANCE_DIR, { recursive: true });

const graphs = listGraphIds().map(migrateGraph);
for (const graph of graphs) {
  writeFileSync(graphPath(graph.graph_id), `${JSON.stringify(graph, null, 2)}\n`);
}
writeFileSync(CONCEPT_REGISTRY_PATH, `${JSON.stringify(buildConceptRegistry(graphs), null, 2)}\n`);
writeFileSync(CROSS_EDGES_PATH, `${JSON.stringify(migrateCrossSubjectEdges(), null, 2)}\n`);

const conceptCount = graphs.reduce(
  (total, graph) => total + graph.nodes.filter((node) => node.kind === "concept").length,
  0,
);
process.stdout.write(
  `[migrate-kg-governance] ${graphs.length} graphs and ${conceptCount} concepts migrated; legacy node ids preserved\n`,
);
