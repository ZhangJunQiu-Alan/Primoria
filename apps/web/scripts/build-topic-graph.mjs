#!/usr/bin/env node
// Collapse the concept-level prerequisite graph into a topic-level DAG artifact.
// Source of truth: temple/calculus_knowledge_graph.json (committed).
// Output: src/lib/knowledge-graph/data/topic-graph.<graphId>.json
//
// The topic DAG powers entry classification (broad menu ordering) and the
// two-lesson linear path (next_topic = min default_order successor).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

const GRAPH_ID = process.argv[2] || "calculus_single_variable_v1";
const SOURCE = resolve(REPO_ROOT, "temple/calculus_knowledge_graph.json");
const OUT_DIR = resolve(__dirname, "../src/lib/knowledge-graph/data");
const OUT = resolve(OUT_DIR, `topic-graph.${GRAPH_ID}.json`);

const graph = JSON.parse(readFileSync(SOURCE, "utf8"));

const topics = new Map();
const conceptTopic = new Map();

for (const node of graph.nodes) {
  if (node.kind === "topic") {
    topics.set(node.id, {
      topicId: node.id,
      name: node.name,
      defaultOrder: node.default_order,
      conceptIds: [],
      successors: [], // {topicId, hard}
      prereqTopics: [], // upstream topic ids (any strength)
    });
  }
}
for (const node of graph.nodes) {
  if (node.kind === "concept") {
    conceptTopic.set(node.id, node.topic);
    topics.get(node.topic).conceptIds.push({ conceptId: node.id, name: node.name, defaultOrder: node.default_order });
  }
}

// Collapse concept prereq edges to topic edges (drop intra-topic + dedupe).
const succ = new Map(); // ft -> Map(tt -> hard?)
const pred = new Map(); // tt -> Set(ft)
for (const e of graph.edges) {
  if (e.type !== "prereq") continue;
  const ft = conceptTopic.get(e.from);
  const tt = conceptTopic.get(e.to);
  if (!ft || !tt || ft === tt) continue;
  if (!succ.has(ft)) succ.set(ft, new Map());
  const m = succ.get(ft);
  m.set(tt, (m.get(tt) || false) || e.strength === "hard");
  if (!pred.has(tt)) pred.set(tt, new Set());
  pred.get(tt).add(ft);
}

for (const [tid, t] of topics) {
  t.conceptIds.sort((a, b) => a.defaultOrder - b.defaultOrder);
  const m = succ.get(tid) || new Map();
  t.successors = [...m.entries()]
    .map(([topicId, hard]) => ({ topicId, hard }))
    .sort((a, b) => topics.get(a.topicId).defaultOrder - topics.get(b.topicId).defaultOrder);
  t.prereqTopics = [...(pred.get(tid) || new Set())].sort(
    (a, b) => topics.get(a).defaultOrder - topics.get(b).defaultOrder,
  );
  t.isRoot = t.prereqTopics.length === 0;
}

const ordered = [...topics.values()].sort((a, b) => a.defaultOrder - b.defaultOrder);

const artifact = {
  graphId: GRAPH_ID,
  subject: graph.subject,
  generatedFrom: "temple/calculus_knowledge_graph.json",
  generatedAt: new Date().toISOString().slice(0, 10),
  note: "Topic-level DAG collapsed from concept prereq edges. successors sorted by defaultOrder; next_topic = first hard successor (fallback: first successor).",
  topics: ordered,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n");

const roots = ordered.filter((t) => t.isRoot).map((t) => t.topicId);
const leaves = ordered.filter((t) => t.successors.length === 0).map((t) => t.topicId);
process.stdout.write(
  `[build-topic-graph] ${GRAPH_ID}: ${ordered.length} topics, ` +
    `${[...succ.values()].reduce((n, m) => n + m.size, 0)} topic edges\n` +
    `  roots: ${roots.join(", ")}\n` +
    `  leaves: ${leaves.join(", ")}\n` +
    `  -> ${OUT}\n`,
);
