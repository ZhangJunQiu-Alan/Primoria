#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { REPO_ROOT, graphPath, listGraphIds, readJson } from "./kg-db-common.mjs";

const OUT = resolve(REPO_ROOT, "data/knowledge-graphs/review/pending/canonical-merge-candidates.json");
const STOP_WORDS = new Set(["a", "an", "and", "for", "in", "of", "the", "to", "with"]);

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokens(value) {
  return new Set(normalize(value).split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token)));
}

function jaccard(left, right) {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

const concepts = [];
for (const graphId of listGraphIds()) {
  const graph = readJson(graphPath(graphId));
  for (const node of graph.nodes) {
    if (node.kind !== "concept") continue;
    concepts.push({
      graph_id: graphId,
      node_id: node.id,
      canonical_id: node.canonical_id,
      name: node.name,
      name_zh: node.name_zh,
      description: node.description,
    });
  }
}

const candidates = [];
for (let i = 0; i < concepts.length; i += 1) {
  for (let j = i + 1; j < concepts.length; j += 1) {
    const left = concepts[i];
    const right = concepts[j];
    if (left.graph_id === right.graph_id) continue;
    const exactEnglish = normalize(left.name) === normalize(right.name);
    const exactChinese = normalize(left.name_zh) === normalize(right.name_zh);
    const nameScore = jaccard(tokens(left.name), tokens(right.name));
    const descriptionScore = jaccard(tokens(left.description), tokens(right.description));
    if (!exactEnglish && !exactChinese && !(nameScore >= 0.8 && descriptionScore >= 0.35)) continue;
    candidates.push({
      left,
      right,
      signals: {
        exact_english_name: exactEnglish,
        exact_chinese_name: exactChinese,
        name_jaccard: Number(nameScore.toFixed(3)),
        description_jaccard: Number(descriptionScore.toFixed(3)),
      },
      decision: "needs_review",
      note_zh: "仅为重复候选；定义、适用范围和课程深度未经人工核对，不得自动合并。",
    });
  }
}

candidates.sort((a, b) => {
  const aScore = Number(a.signals.exact_english_name) + Number(a.signals.exact_chinese_name) + a.signals.name_jaccard;
  const bScore = Number(b.signals.exact_english_name) + Number(b.signals.exact_chinese_name) + b.signals.name_jaccard;
  return bScore - aScore;
});

mkdirSync(resolve(OUT, ".."), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      schema_version: "1.0.0",
      generated_at: "2026-07-17",
      method: "跨图名称标准化与描述词集合相似度；只生成候选，不修改 canonical_id。",
      candidates,
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(`[find-kg-duplicate-candidates] ${candidates.length} pending candidate pairs -> ${OUT}\n`);
