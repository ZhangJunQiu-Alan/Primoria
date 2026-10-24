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

const styleDataset = TutorBenchmarkDatasetSchema.parse(
  JSON.parse(await readFile(new URL("../evals/tutor-style.v1.json", import.meta.url), "utf8")),
);
assert.equal(styleDataset.cases.length, 13);
assert.ok(styleDataset.cases.every((item) => item.tutorStyle));
// The personalization gate is 1.0, so a case without a style marker could never pass.
assert.ok(styleDataset.cases.every((item) => item.checks.some((check) => check.dimension === "personalization")));
assert.deepEqual(new Set(styleDataset.cases.map((item) => item.tutorStyle)), new Set(["socratic", "feynman", "euclid"]));
/** @type {Map<string, Set<string>>} */
const stylesByPrompt = new Map();
for (const item of styleDataset.cases) {
  stylesByPrompt.set(item.prompt, new Set([...(stylesByPrompt.get(item.prompt) ?? []), item.tutorStyle]));
}
assert.equal([...stylesByPrompt.values()].filter((styles) => styles.size === 3).length, 4, "four prompts run under all three styles");

// The markers must tell the styles apart: each exemplar passes its own style's
// case and fails the other two on the same prompt.
const styleExemplars = {
  socratic: "好问题，我们先从一个场景推起 👇\n\n**🚗 场景**\n你开车时，速度表上的数字一直在变。\n\n> 🤔 **速度表上的数字，和“一小时走了 60 公里”说的是同一件事吗？**",
  feynman: "**🚗 先打个比方**\n想象你在开车，速度表告诉你“此刻”有多快，而不是一路的平均速度。\n\n**💡 导数是什么**\n导数就像函数的速度表：它衡量函数在某一点变化得有多快。\n\n> 👉 **你能用自己的话，把导数讲给一个朋友听吗？**",
  euclid: "**📌 定义**\n若极限 lim_{h→0} [f(x₀+h) − f(x₀)]/h 存在，则称 f 在 x₀ 可导，该极限即导数 f′(x₀)。\n\n**⚖️ 成立条件**\n- 极限存在；左右极限不等时（如 |x| 在 0 处）不可导。\n\n**🔧 构造步骤**\n1. 平均变化率：[f(x₀+h) − f(x₀)]/h。\n2. 令 h→0 取极限（极限的定义）。\n\n> 🤔 **为什么不能直接令 h = 0？**",
};
for (const target of ["socratic", "feynman", "euclid"]) {
  const item = styleDataset.cases.find((candidate) => candidate.id === `${target}.derivative.zh`);
  assert.ok(item, `missing ${target}.derivative.zh`);
  for (const [style, response] of Object.entries(styleExemplars)) {
    const report = evaluateTutorBenchmark(
      { ...styleDataset, cases: [item] },
      {
        schemaVersion: 1,
        benchmarkId: styleDataset.benchmarkId,
        run: { mode: "imported", startedAt: "2026-10-24T00:00:00.000Z", provider: null, model: null },
        responses: [{ caseId: item.id, response, latencyMs: null, inputTokens: null, outputTokens: null, costUsd: null }],
      },
    );
    assert.equal(report.cases[0].tutorStyle, target);
    assert.equal(report.cases[0].passed, style === target, `${style} exemplar ${style === target ? "passes" : "fails"} ${item.id}`);
  }
}

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
