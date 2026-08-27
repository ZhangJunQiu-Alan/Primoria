#!/usr/bin/env node
/**
 * Derive prerequisite edges for the overlay (needs_review) graphs from official
 * curriculum evidence that already exists in this repository.
 *
 * The 10 China/Singapore graphs are coverage overlays: only the "gap" concepts
 * missing from existing graphs were authored, so most of their curriculum
 * requirements are satisfied by approved graphs (see docs/knowledge-graph/catalog.md).
 * Nothing linked them to those graphs, leaving ~40% of their concepts with no
 * prerequisite in either direction.
 *
 * Ordering evidence is the official syllabus itself. Within one syllabus topic the
 * framework lists outcomes in authored order, and `curricula/mappings/pending/`
 * already records which concepts satisfy each outcome. An edge is emitted from the
 * concepts covering the nearest preceding covered outcome in the same topic to the
 * concepts covering the current outcome.
 *
 * Deliberately NOT inferred semantically: automated prerequisite extraction runs
 * around 0.49 precision, and a wrong prerequisite harms a learner more than a
 * missing one. Every emitted edge cites the two official outcomes it came from and
 * is written as `needs_review`, so a subject reviewer decides. Cross-graph edges
 * stay inert until approved because build-topic-graph.mjs filters cross-subject
 * edges to `review_status === "approved"`.
 *
 * Strength: `hard` when the downstream outcome is advanced-only (its cognitive
 * processes contain no `understand`/`remember`, so it purely applies prior
 * knowledge and cannot be attempted cold); otherwise `soft`.
 *
 * Usage:
 *   node apps/web/scripts/derive-overlay-prereq-edges.mjs            # dry run
 *   node apps/web/scripts/derive-overlay-prereq-edges.mjs --apply    # write files
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes("--apply");

const FOUNDATIONAL = new Set(["understand", "remember"]);

/** graph id -> outcome-coverage mapping set for that graph's curriculum. */
const GRAPH_FRAMEWORK = {
  senior_secondary_biology: "cn_moe_senior_high_biology_2020",
  senior_secondary_chemistry: "cn_moe_senior_high_chemistry_2020",
  senior_secondary_mathematics: "cn_moe_senior_high_math_2020_outcomes",
  senior_secondary_physics: "cn_moe_senior_high_physics_2020",
  singapore_h2_biology: "sg_seab_h2_biology_9477_2026",
  singapore_h2_chemistry: "sg_seab_h2_chemistry_9476_2026",
  singapore_h2_mathematics: "sg_seab_h2_math_9758_2026",
  singapore_h2_physics: "sg_seab_h2_physics_9478_2026",
  singapore_lower_secondary_science: "sg_moe_lower_secondary_g2_g3_science_2021",
  singapore_secondary_mathematics: "sg_moe_secondary_g2_g3_math_2020",
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

/**
 * Syllabus topic key for a requirement code: the code minus its trailing ordinal.
 * Grouping only ever needs to be conservative — a finer split yields fewer edges.
 *   "1.a" -> "1"            "1.1.01" -> "1.1"
 *   "SE.V01" -> "SE"        "必修 1·1.1.1" -> "必修 1·1.1"
 */
function topicKey(code) {
  const m = /^(.*)[.·]([^.·]+)$/.exec(code);
  if (m) return m[1];
  const n = /^(\d+)([a-z])$/.exec(code);
  if (n) return n[1];
  return code;
}

/** An outcome that supplies no foundation of its own is a genuine gate. */
function isAdvancedOnly(requirement) {
  const cp = requirement.cognitive_processes ?? [];
  return cp.length > 0 && !cp.some((p) => FOUNDATIONAL.has(p));
}

/**
 * Authored teaching position of a concept: (topic order, concept order).
 *
 * Syllabus outcome order and a graph's authored `default_order` do not always
 * agree. Where they disagree the syllabus-derived edge points backwards through
 * the curriculum — "Overweight and weightlessness" before "SI mechanics units" —
 * which is both pedagogically wrong and a violation of the frontier builder's
 * invariant that empty mastery reproduces authored order exactly. Those edges are
 * dropped rather than emitted; a genuine backward dependency needs a human author.
 */
function authoredPosition(graph) {
  const topicOrder = new Map(
    graph.nodes.filter((n) => n.kind === "topic").map((n) => [n.id, n.default_order ?? 0]),
  );
  const position = new Map();
  for (const node of graph.nodes) {
    if (node.kind !== "concept") continue;
    position.set(node.id, [topicOrder.get(node.topic) ?? 0, node.default_order ?? 0]);
  }
  return position;
}

/** Strictly earlier in authored teaching order. */
function precedes(position, fromId, toId) {
  const a = position.get(fromId);
  const b = position.get(toId);
  if (!a || !b) return false;
  return a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1];
}

// ---------------------------------------------------------------- load corpus

const graphIds = Object.keys(GRAPH_FRAMEWORK);

// Every source graph (approved + overlay) so canonical ids resolve anywhere.
const NON_GRAPH_FILES = new Set(["cross_subject_edges.json", "kg_zh_labels.json"]);
const graphs = new Map();
for (const file of readdirSync(resolve(DATA, "source")).sort()) {
  if (!file.endsWith(".json") || NON_GRAPH_FILES.has(file)) continue;
  graphs.set(file.replace(/\.json$/, ""), readJson(resolve(DATA, "source", file)));
}

const cross = readJson(resolve(DATA, "source/cross_subject_edges.json"));

/** canonical_id -> [{ graphId, nodeId }] */
const byCanonical = new Map();
for (const [graphId, graph] of graphs) {
  for (const node of graph.nodes) {
    if (node.kind !== "concept" || !node.canonical_id) continue;
    if (!byCanonical.has(node.canonical_id)) byCanonical.set(node.canonical_id, []);
    byCanonical.get(node.canonical_id).push({ graphId, nodeId: node.id });
  }
}

// ------------------------------------------------------- existing edge indexes

/** "graphId:nodeId" -> Set of downstream "graphId:nodeId" (intra + cross). */
const adjacency = new Map();
const existing = new Set();
const key = (g, n) => `${g}:${n}`;
const link = (from, to) => {
  if (!adjacency.has(from)) adjacency.set(from, new Set());
  adjacency.get(from).add(to);
};
for (const [graphId, graph] of graphs) {
  for (const edge of graph.edges ?? []) {
    if (edge.type !== "prereq") continue;
    const a = key(graphId, edge.from);
    const b = key(graphId, edge.to);
    existing.add(`${a}->${b}`);
    link(a, b);
  }
}
for (const edge of cross.edges) {
  const a = key(edge.from_graph.replace(/\.json$/, ""), edge.from);
  const b = key(edge.to_graph.replace(/\.json$/, ""), edge.to);
  existing.add(`${a}->${b}`);
  link(a, b);
}

/** Would adding from->to close a cycle? (i.e. is `from` already reachable from `to`) */
function createsCycle(from, to) {
  if (from === to) return true;
  const seen = new Set([to]);
  const stack = [to];
  while (stack.length) {
    const node = stack.pop();
    if (node === from) return true;
    for (const next of adjacency.get(node) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return false;
}

// ------------------------------------------------------------- derive edges

const intraByGraph = new Map(graphIds.map((id) => [id, []]));
const crossEdges = [];
const stats = [];

for (const graphId of graphIds) {
  const frameworkId = GRAPH_FRAMEWORK[graphId];
  const framework = readJson(resolve(DATA, `curricula/frameworks/${frameworkId}.json`));
  const mappingSet = readJson(resolve(DATA, `curricula/mappings/pending/${frameworkId}.json`));
  const mappingByRequirement = new Map(mappingSet.mappings.map((m) => [m.requirement_id, m]));
  const declaredSources = new Set(graphs.get(graphId).source_ids ?? []);
  const position = authoredPosition(graphs.get(graphId));

  // Requirements in authored syllabus order, grouped by topic, keeping only
  // outcomes that some concept actually covers.
  const byTopic = new Map();
  for (const requirement of framework.requirements) {
    const mapping = mappingByRequirement.get(requirement.requirement_id);
    if (!mapping || mapping.coverage_status !== "full") continue;
    const concepts = (mapping.canonical_ids ?? []).flatMap((cid) => byCanonical.get(cid) ?? []);
    if (concepts.length === 0) continue;
    const t = topicKey(requirement.code);
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t).push({ requirement, mapping, concepts });
  }

  let intra = 0;
  let crossN = 0;
  let hard = 0;
  let skippedCycle = 0;
  let skippedBackwards = 0;

  for (const chain of byTopic.values()) {
    for (let i = 1; i < chain.length; i += 1) {
      const prev = chain[i - 1];
      const curr = chain[i];
      const strength = isAdvancedOnly(curr.requirement) ? "hard" : "soft";

      const evidence = [];
      const seenRef = new Set();
      for (const ref of [...prev.requirement.evidence_refs, ...curr.requirement.evidence_refs]) {
        const k = `${ref.source_id}|${ref.locator}`;
        if (seenRef.has(k)) continue;
        seenRef.add(k);
        evidence.push({ source_id: ref.source_id, locator: ref.locator });
      }

      const reason =
        `依据官方课程同一主题内的成果顺序，${prev.requirement.code} 为 ${curr.requirement.code} 的前置要求。`.slice(
          0,
          240,
        );

      // Only enrich overlay graphs; never rewrite an approved graph's structure.
      for (const to of curr.concepts.filter((c) => c.graphId === graphId)) {
        for (const from of prev.concepts) {
          const a = key(from.graphId, from.nodeId);
          const b = key(to.graphId, to.nodeId);
          if (a === b) continue;
          if (existing.has(`${a}->${b}`)) continue;
          if (createsCycle(a, b)) {
            skippedCycle += 1;
            continue;
          }

          if (from.graphId === graphId) {
            // Intra-graph edges must agree with authored teaching order.
            if (!precedes(position, from.nodeId, to.nodeId)) {
              skippedBackwards += 1;
              continue;
            }
            const refs = evidence.filter((r) => declaredSources.has(r.source_id));
            intraByGraph.get(graphId).push({
              from: from.nodeId,
              to: to.nodeId,
              type: "prereq",
              strength,
              reason,
              evidence_refs: refs,
              review_status: "needs_review",
            });
            intra += 1;
          } else {
            crossEdges.push({
              from: from.nodeId,
              to: to.nodeId,
              type: "prereq",
              strength,
              from_graph: `${from.graphId}.json`,
              to_graph: `${to.graphId}.json`,
              reason,
              evidence_refs: evidence,
              review_status: "needs_review",
            });
            crossN += 1;
          }
          if (strength === "hard") hard += 1;
          existing.add(`${a}->${b}`);
          link(a, b);
        }
      }
    }
  }
  stats.push({ graphId, intra, cross: crossN, hard, skippedCycle, skippedBackwards });
}

// ------------------------------------------------------------------- report

const total = (k) => stats.reduce((n, s) => n + s[k], 0);
process.stdout.write(
  `${"graph".padEnd(34)}${"intra".padStart(7)}${"cross".padStart(7)}${"hard".padStart(6)}${"cycles".padStart(8)}${"backwd".padStart(8)}\n`,
);
for (const s of stats) {
  process.stdout.write(
    `${s.graphId.padEnd(34)}${String(s.intra).padStart(7)}${String(s.cross).padStart(7)}` +
      `${String(s.hard).padStart(6)}${String(s.skippedCycle).padStart(8)}${String(s.skippedBackwards).padStart(8)}\n`,
  );
}
process.stdout.write(
  `${"TOTAL".padEnd(34)}${String(total("intra")).padStart(7)}${String(total("cross")).padStart(7)}` +
    `${String(total("hard")).padStart(6)}${String(total("skippedCycle")).padStart(8)}${String(total("skippedBackwards")).padStart(8)}\n`,
);

// Named sample so a reviewer can sanity-check plausibility before anything is written.
if (process.argv.includes("--sample")) {
  const nameOf = (graphId, nodeId) =>
    graphs.get(graphId)?.nodes.find((n) => n.id === nodeId)?.name ?? nodeId;
  const show = (label, edges) => {
    process.stdout.write(`\n--- ${label} ---\n`);
    for (const e of edges.slice(0, 12)) {
      const fg = e.from_graph ? e.from_graph.replace(/\.json$/, "") : e.__graph;
      const tg = e.to_graph ? e.to_graph.replace(/\.json$/, "") : e.__graph;
      process.stdout.write(
        `[${e.strength}] ${nameOf(fg, e.from)}  →  ${nameOf(tg, e.to)}\n` +
          `        ${fg} → ${tg}\n`,
      );
    }
  };
  show("cross-graph (hard)", crossEdges.filter((e) => e.strength === "hard"));
  show("cross-graph (soft)", crossEdges.filter((e) => e.strength === "soft"));
  const intraFlat = [...intraByGraph.entries()].flatMap(([g, es]) =>
    es.map((e) => ({ ...e, __graph: g })),
  );
  show("intra-graph", intraFlat);
}

if (!APPLY) {
  process.stdout.write("\nDry run. Re-run with --apply to write these edges.\n");
  process.exit(0);
}

// -------------------------------------------------------------------- write

const bump = (version) => {
  const parts = String(version).split(".").map(Number);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join(".");
};

for (const graphId of graphIds) {
  const added = intraByGraph.get(graphId);
  if (added.length === 0) continue;
  const graph = graphs.get(graphId);
  graph.edges.push(...added);
  graph.content_version = bump(graph.content_version);
  graph.changelog.push({
    version: graph.content_version,
    date: TODAY,
    summary_zh: `依据官方课程成果顺序补充 ${added.length} 条同图前置边（含 ${added.filter((e) => e.strength === "hard").length} 条硬前置），状态保持 needs_review。`,
  });
  writeJson(resolve(DATA, `source/${graphId}.json`), graph);
  process.stdout.write(`[derive] ${graphId}: +${added.length} intra-graph edges\n`);
}

if (crossEdges.length > 0) {
  cross.edges.push(...crossEdges);
  for (const edge of crossEdges) {
    for (const ref of edge.evidence_refs) {
      if (!cross.source_ids.includes(ref.source_id)) cross.source_ids.push(ref.source_id);
    }
  }
  cross.source_ids.sort();
  cross.content_version = bump(cross.content_version);
  cross.changelog.push({
    version: cross.content_version,
    date: TODAY,
    summary_zh: `依据官方课程成果顺序，为 10 个 needs_review 覆盖图补充 ${crossEdges.length} 条跨图前置边，状态保持 needs_review，审核通过前不进入运行时。`,
  });
  writeJson(resolve(DATA, "source/cross_subject_edges.json"), cross);
  process.stdout.write(`[derive] cross_subject_edges: +${crossEdges.length} cross-graph edges\n`);
}
