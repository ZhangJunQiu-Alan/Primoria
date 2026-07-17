#!/usr/bin/env node
// Source-of-truth KG validator. Reads data/knowledge-graphs/source/*.json directly (no DB) and gates
// the localization contract: every topic/concept node must carry a non-empty
// name (English) and name_zh (Chinese), and every reference (concept->topic,
// edge from/to) must resolve. Skips non-graph sidecars (cross edges, label file).
//
// Usage: node validate-kg.mjs [<graphId> | all]   (default: all)
// Exits non-zero on any failure so it can gate CI / pnpm validate:kg.

import { readFileSync } from "node:fs";

import { listGraphIds, graphPath } from "./kg-db-common.mjs";

function validateGraph(graphId) {
  const graph = JSON.parse(readFileSync(graphPath(graphId), "utf8"));
  const errors = [];

  if (!Array.isArray(graph.nodes)) {
    errors.push("missing nodes array");
    return errors;
  }
  if (!Array.isArray(graph.edges)) errors.push("missing edges array");

  const ids = new Set();
  const topicIds = new Set();
  const conceptIds = new Set();

  for (const node of graph.nodes) {
    if (!node.id) {
      errors.push("node with missing id");
      continue;
    }
    if (ids.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    ids.add(node.id);

    if (node.kind !== "topic" && node.kind !== "concept") {
      errors.push(`${node.id}: unsupported kind ${node.kind}`);
      continue;
    }
    if (node.kind === "topic") topicIds.add(node.id);
    else conceptIds.add(node.id);

    const isStr = (v) => typeof v === "string" && v.trim().length > 0;
    if (!isStr(node.name)) errors.push(`${node.id}: missing/empty name`);
    if (!isStr(node.name_zh)) errors.push(`${node.id}: missing/empty name_zh`);
    if (node.assessment_hint !== undefined) {
      if (!isStr(node.assessment_hint)) {
        errors.push(`${node.id}: assessment_hint must be a non-empty string when present`);
      } else if (node.assessment_hint.length > 240) {
        errors.push(`${node.id}: assessment_hint exceeds 240 chars (${node.assessment_hint.length})`);
      }
    }
  }

  // concept -> topic reference integrity
  const conceptsByTopic = new Map();
  for (const node of graph.nodes) {
    if (node.kind !== "concept") continue;
    if (!topicIds.has(node.topic)) {
      errors.push(`concept ${node.id} references missing topic ${node.topic}`);
    }
    if (!conceptsByTopic.has(node.topic)) conceptsByTopic.set(node.topic, []);
    conceptsByTopic.get(node.topic).push(node.id);
  }

  // Topic grain gate: each lesson-generating topic should stay small enough for
  // focused lessons and future per-concept quizzes.
  for (const topicId of topicIds) {
    const count = conceptsByTopic.get(topicId)?.length ?? 0;
    if (count < 2 || count > 3) {
      errors.push(`topic ${topicId} must contain 2-3 concepts (found ${count})`);
    }
  }

  // edge reference integrity (concept-level prereq edges) + optional rationale
  for (const edge of graph.edges ?? []) {
    if (!conceptIds.has(edge.from)) errors.push(`edge from missing concept ${edge.from}`);
    if (!conceptIds.has(edge.to)) errors.push(`edge to missing concept ${edge.to}`);
    if (edge.reason !== undefined) {
      if (typeof edge.reason !== "string" || edge.reason.trim() === "") {
        errors.push(`edge ${edge.from}->${edge.to}: reason must be a non-empty string when present`);
      } else if (edge.reason.length > 240) {
        errors.push(`edge ${edge.from}->${edge.to}: reason exceeds 240 chars (${edge.reason.length})`);
      }
    }
  }

  return errors;
}

function main() {
  const arg = process.argv[2] || "all";
  const ids = arg === "all" ? listGraphIds() : [arg];

  let failed = 0;
  for (const graphId of ids) {
    const errors = validateGraph(graphId);
    if (errors.length === 0) {
      process.stdout.write(`✅ ${graphId}\n`);
    } else {
      failed += 1;
      process.stdout.write(`❌ ${graphId} (${errors.length} problem${errors.length > 1 ? "s" : ""})\n`);
      for (const e of errors.slice(0, 20)) process.stdout.write(`   - ${e}\n`);
      if (errors.length > 20) process.stdout.write(`   …(+${errors.length - 20} more)\n`);
    }
  }

  if (failed) {
    process.stdout.write(`\n[validate-kg] ${failed}/${ids.length} graph(s) failed\n`);
    process.exit(1);
  }
  process.stdout.write(`\n[validate-kg] all ${ids.length} graph(s) passed\n`);
}

main();
