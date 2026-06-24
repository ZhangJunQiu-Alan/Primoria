#!/usr/bin/env node
// One-time/idempotent migration: fold temple/kg_zh_labels.json (a flat
// {nodeId -> 中文名} sidecar) into each temple/<graphId>.json node as `name_zh`.
//
// After this runs, temple/*.json is the single source of truth for Chinese
// display names: build-topic-graph.mjs carries name_zh into the static artifact
// and validate-kg.mjs enforces it. kg_zh_labels.json is kept only as the merge
// input/archive — it is NOT a runtime source.
//
// Usage: node merge-kg-zh-labels.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { TEMPLE_DIR, REPO_ROOT, listGraphIds, graphPath, readJson } from "./kg-db-common.mjs";

function loadZhLabels() {
  const path = resolve(TEMPLE_DIR, "kg_zh_labels.json");
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  return readJson(path).labels ?? {};
}

function main() {
  const labels = loadZhLabels();
  let totalNodes = 0;
  let written = 0;
  const missing = [];

  for (const graphId of listGraphIds()) {
    const path = graphPath(graphId);
    const graph = JSON.parse(readFileSync(path, "utf8"));
    let changed = false;

    for (const node of graph.nodes) {
      if (node.kind !== "topic" && node.kind !== "concept") continue;
      totalNodes += 1;
      const zh = labels[node.id];
      if (typeof zh === "string" && zh.trim()) {
        if (node.name_zh !== zh) {
          node.name_zh = zh;
          changed = true;
          written += 1;
        }
      } else if (!node.name_zh) {
        missing.push(`${graphId}:${node.id}`);
      }
    }

    if (changed) {
      writeFileSync(path, JSON.stringify(graph, null, 2) + "\n");
      process.stdout.write(`[merge-kg-zh] updated ${graphId}\n`);
    }
  }

  process.stdout.write(`[merge-kg-zh] ${totalNodes} nodes, ${written} name_zh written\n`);
  if (missing.length) {
    process.stdout.write(`[merge-kg-zh] WARNING: ${missing.length} nodes lack a zh label:\n`);
    for (const m of missing.slice(0, 20)) process.stdout.write(`  - ${m}\n`);
    process.exitCode = 1;
  }
}

main();
