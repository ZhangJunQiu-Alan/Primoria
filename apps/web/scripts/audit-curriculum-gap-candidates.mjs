#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/source");
const GAP_PATH = resolve(
  REPO_ROOT,
  process.argv[2] ?? "data/knowledge-graphs/curricula/gaps/pending/cn_moe_senior_high_math_2020_outcomes.json",
);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "application",
  "applications",
  "basic",
  "from",
  "in",
  "introduction",
  "method",
  "of",
  "the",
  "to",
  "using",
  "with",
]);

function tokens(value) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((token) => token && !STOP_WORDS.has(token)),
  );
}

function chineseBigrams(value) {
  const text = value.replace(/[^\p{Script=Han}]/gu, "");
  const result = new Set();
  for (let index = 0; index < text.length - 1; index += 1) result.add(text.slice(index, index + 2));
  return result;
}

function overlap(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const value of left) if (right.has(value)) shared += 1;
  return shared / Math.min(left.size, right.size);
}

function score(candidate, concept) {
  const english = overlap(tokens(`${candidate.proposed_name} ${candidate.scope_zh}`), tokens(`${concept.name} ${concept.description}`));
  const chinese = overlap(chineseBigrams(`${candidate.proposed_name_zh}${candidate.scope_zh}`), chineseBigrams(concept.name_zh));
  const exactEnglish = candidate.proposed_name.toLowerCase() === concept.name.toLowerCase() ? 1 : 0;
  const exactChinese = candidate.proposed_name_zh === concept.name_zh ? 1 : 0;
  return Math.max(exactEnglish, exactChinese, english, chinese);
}

const concepts = [];
for (const filename of readdirSync(SOURCE_DIR).filter((entry) => entry.endsWith(".json"))) {
  const graph = readJson(resolve(SOURCE_DIR, filename));
  for (const node of graph.nodes ?? []) {
    if (node.kind !== "concept") continue;
    concepts.push({
      graph_id: graph.graph_id,
      node_id: node.id,
      canonical_id: node.canonical_id,
      name: node.name,
      name_zh: node.name_zh,
      description: node.description,
    });
  }
}

const gapSet = readJson(GAP_PATH);
for (const candidate of gapSet.candidates) {
  const matches = concepts
    .map((concept) => ({ ...concept, score: score(candidate, concept) }))
    .filter((concept) => concept.score >= 0.34)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, 8);
  process.stdout.write(`${JSON.stringify({
    gap_id: candidate.gap_id,
    action: candidate.action,
    proposed_name: candidate.proposed_name,
    proposed_name_zh: candidate.proposed_name_zh,
    existing_canonical_ids: candidate.existing_canonical_ids,
    matches,
  })}\n`);
}
