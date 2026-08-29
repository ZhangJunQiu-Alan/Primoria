import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  TutorBenchmarkDatasetSchema,
  evaluateTutorBenchmark,
  formatTutorBenchmarkMarkdown,
} from "../src/evaluation/tutor-benchmark.mjs";
import { buildChineseTutorBenchmarkDataset } from "../evals/tutor-benchmark.zh.v1.source.mjs";

const realDataset = TutorBenchmarkDatasetSchema.parse(
  JSON.parse(await readFile(new URL("../evals/tutor-benchmark.v1.json", import.meta.url), "utf8")),
);
assert.equal(realDataset.cases.length, 12);
assert.ok(new Set(realDataset.cases.map((item) => item.domain)).size >= 5);
assert.ok(realDataset.cases.some((item) => item.language === "zh-CN"));
assert.ok(realDataset.cases.some((item) => item.language === "en"));
assert.ok(realDataset.cases.some((item) => item.sources.length > 0));

const chineseDataset = TutorBenchmarkDatasetSchema.parse(
  JSON.parse(await readFile(new URL("../evals/tutor-benchmark.zh.v1.json", import.meta.url), "utf8")),
);
const rebuiltChineseDataset = TutorBenchmarkDatasetSchema.parse(buildChineseTutorBenchmarkDataset());
assert.deepEqual(chineseDataset, rebuiltChineseDataset);
assert.equal(chineseDataset.cases.length, 60);
assert.equal(new Set(chineseDataset.cases.map((item) => item.learnerProfileId)).size, 20);
assert.equal(new Set(chineseDataset.cases.map((item) => item.domain)).size, 6);
assert.deepEqual(new Set(chineseDataset.cases.map((item) => item.language)), new Set(["zh-CN"]));
assert.deepEqual(
  Object.fromEntries(
    ["concept_understanding", "problem_solving", "application", "comparison"].map((type) => [
      type,
      chineseDataset.cases.filter((item) => item.tutorBenchTaskType === type).length,
    ]),
  ),
  { concept_understanding: 18, problem_solving: 18, application: 12, comparison: 12 },
);

const dataset = {
  schemaVersion: 1,
  benchmarkId: "unit-bench",
  description: "Synthetic evaluator contract fixture.",
  casePassThreshold: 1,
  dimensionWeights: {
    correctness: 0.35,
    source_faithfulness: 0.2,
    personalization: 0.15,
    pedagogy: 0.15,
    instruction_following: 0.1,
    safety: 0.05,
  },
  cases: [
    {
      id: "synthetic.case",
      language: "en",
      domain: "mathematics",
      task: "source_grounded",
      prompt: "Synthetic prompt",
      learnerContext: { priorKnowledge: [], misconceptions: [], preferences: [], goals: [] },
      sources: [{ id: "S1", title: "Source", content: "The answer is 42." }],
      checks: [
        { id: "all", dimension: "correctness", kind: "contains_all", description: "all text", values: ["answer", "42"] },
        { id: "any", dimension: "personalization", kind: "contains_any", description: "one alternative", values: ["tailored", "adapted"] },
        { id: "forbidden", dimension: "safety", kind: "not_contains", description: "no secret", values: ["secret"] },
        { id: "pattern", dimension: "correctness", kind: "regex", description: "answer pattern", pattern: "answer\\s+is\\s+42" },
        { id: "not-pattern", dimension: "safety", kind: "not_regex", description: "no hidden label", pattern: "hidden context" },
        { id: "number", dimension: "correctness", kind: "numeric", description: "numeric answer", value: 42, tolerance: 0 },
        { id: "decimal", dimension: "correctness", kind: "numeric", description: "decimal answer", value: 4.9, tolerance: 0 },
        { id: "citation", dimension: "source_faithfulness", kind: "citation_ids", description: "valid source", ids: ["S1"] },
        { id: "question", dimension: "pedagogy", kind: "regex_count", description: "one question", pattern: "[?]", min: 1, max: 1 },
        { id: "length", dimension: "instruction_following", kind: "max_chars", description: "short", value: 200 }
      ]
    }
  ]
};

const responseSet = (response) => ({
  schemaVersion: 1,
  benchmarkId: "unit-bench",
  run: { mode: "imported", startedAt: "2026-07-17T00:00:00.000Z", provider: null, model: null },
  responses: [{ caseId: "synthetic.case", response, latencyMs: 20, inputTokens: 10, outputTokens: 8, costUsd: 0.001 }]
});

const passing = evaluateTutorBenchmark(dataset, responseSet("The tailored answer is 42 and the decimal is 4.9 [source:S1]. Ready to check it?"));
assert.equal(passing.summary.qualityGatePassed, true);
assert.equal(passing.summary.meanScore, 1);
assert.equal(passing.summary.operations.latencyP50Ms, 20);
assert.equal(passing.summary.operations.knownCostUsd, 0.001);

const failing = evaluateTutorBenchmark(dataset, responseSet("A secret answer is 41 [source:UNKNOWN]."));
assert.equal(failing.summary.qualityGatePassed, false);
assert.ok(failing.summary.meanScore < 1);
assert.match(formatTutorBenchmarkMarkdown(failing), /Failed checks/);
assert.match(formatTutorBenchmarkMarkdown(failing), /unknown: UNKNOWN/);

const dimensionGated = evaluateTutorBenchmark(
  { ...dataset, casePassThreshold: 0.8, dimensionMinimums: { correctness: 1 } },
  responseSet("The tailored answer is 42 and the decimal is 4.8 [source:S1]. Ready to check it?"),
);
assert.ok(dimensionGated.summary.meanScore > 0.8);
assert.equal(dimensionGated.cases[0].passed, false);
assert.deepEqual(dimensionGated.cases[0].failedDimensionGates, ["correctness"]);

function regressionCase(caseId, response) {
  const item = realDataset.cases.find((candidate) => candidate.id === caseId);
  assert.ok(item, `missing regression case ${caseId}`);
  const result = evaluateTutorBenchmark(
    { ...realDataset, cases: [item] },
    {
      schemaVersion: 1,
      benchmarkId: realDataset.benchmarkId,
      run: { mode: "imported", startedAt: "2026-07-17T00:00:00.000Z", provider: null, model: null },
      responses: [{ caseId, response, latencyMs: null, inputTokens: null, outputTokens: null, costUsd: null }]
    }
  );
  return new Map(result.cases[0].checks.map((check) => [check.id, check.passed]));
}

const linearRegression = regressionCase(
  "math.linear-equation.zh",
  "等式两边减去5，再让等式两边除以3，x = 8。这是在两边做相反的运算，最后代回原式验算。"
);
assert.equal(linearRegression.get("misconception"), true);

const probabilityRegression = regressionCase(
  "math.probability-without-replacement.zh",
  "第一次是 \\frac{3}{5}，总球数减少，第二次是 \\frac{2}{4}，所以答案是 \\frac{3}{10}。"
);
assert.equal(probabilityRegression.get("calculation"), true);
assert.equal(probabilityRegression.get("denominator-change"), true);

const inclineRegression = regressionCase(
  "physics.incline.zh",
  "沿斜面加速度 a = g·sinθ = 9.8 × 0.5 = 4.9 m/s²；m 约掉，所以与质量无关。"
);
assert.equal(inclineRegression.get("answer"), true);
assert.equal(inclineRegression.get("formula"), true);

const missing = evaluateTutorBenchmark(dataset, {
  schemaVersion: 1,
  benchmarkId: "unit-bench",
  run: { mode: "imported", startedAt: "2026-07-17T00:00:00.000Z", provider: null, model: null },
  responses: [{ caseId: "unrelated.case", response: "unused", latencyMs: null, inputTokens: null, outputTokens: null, costUsd: null }]
});
assert.deepEqual(missing.summary.missingResponseIds, ["synthetic.case"]);
assert.deepEqual(missing.summary.extraResponseIds, ["unrelated.case"]);
assert.equal(missing.summary.qualityGatePassed, false);

process.stdout.write("[tutor-benchmark.unit] ALL CHECKS PASSED\n");
