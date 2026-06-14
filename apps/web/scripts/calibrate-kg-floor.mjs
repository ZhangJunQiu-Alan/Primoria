#!/usr/bin/env node
// Calibrate KG_POSITION_FLOOR (route B, 选项 4).
// Hits the live /api/knowledge-graph/search for a handful of labelled in/out-of
// domain goals, takes each query's max recall similarity, and prints a
// suggested FLOOR that separates the two groups.
//
// Usage: KG_SEARCH_URL=http://localhost:3000/api/knowledge-graph/search \
//        node scripts/calibrate-kg-floor.mjs
//
// Requires the web server running with DATABASE_URL + OPENAI_* configured.

import { FLOOR_CALIBRATION_QUERIES, suggestFloor } from "../src/lib/knowledge-graph/floor-calibration.ts";

const SEARCH_URL = process.env.KG_SEARCH_URL || "http://localhost:3000/api/knowledge-graph/search";

async function maxSimilarity(query) {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, topK: 15 }),
  });
  if (!res.ok) throw new Error(`search failed for "${query}": ${res.status} ${await res.text()}`);
  const json = await res.json();
  const sims = (json.results || []).map((r) => r.similarity);
  return sims.length ? Math.max(...sims) : 0;
}

async function group(label, queries) {
  const out = [];
  for (const q of queries) {
    const sim = await maxSimilarity(q);
    out.push(sim);
    process.stdout.write(`  [${label}] ${q.padEnd(16)} maxSim=${sim.toFixed(4)}\n`);
  }
  return out;
}

async function main() {
  process.stdout.write(`Calibrating FLOOR via ${SEARCH_URL}\n`);
  const inDomain = await group("in ", FLOOR_CALIBRATION_QUERIES.inDomain);
  const outOfDomain = await group("out", FLOOR_CALIBRATION_QUERIES.outOfDomain);
  const s = suggestFloor(inDomain, outOfDomain);
  process.stdout.write(
    `\nin-domain min = ${s.inDomainMin}  out-of-domain max = ${s.outOfDomainMax}  margin = ${s.margin}\n` +
      (s.separable ? "" : "WARNING: groups overlap; revise samples or query encoding.\n") +
      `=> set KG_POSITION_FLOOR=${s.suggestedFloor}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`[calibrate-kg-floor] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
