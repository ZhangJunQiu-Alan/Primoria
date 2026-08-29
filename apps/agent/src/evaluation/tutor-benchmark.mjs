import { z } from "zod";

export const TUTOR_BENCHMARK_DIMENSIONS = [
  "correctness",
  "source_faithfulness",
  "personalization",
  "pedagogy",
  "instruction_following",
  "safety",
];

const DimensionSchema = z.enum(/** @type {[string, ...string[]]} */ (TUTOR_BENCHMARK_DIMENSIONS));
const CheckKindSchema = z.enum([
  "contains_all",
  "contains_any",
  "not_contains",
  "regex",
  "not_regex",
  "numeric",
  "citation_ids",
  "regex_count",
  "max_chars",
]);

const CheckSchema = z
  .object({
    id: z.string().min(1),
    dimension: DimensionSchema,
    kind: CheckKindSchema,
    description: z.string().min(1),
    weight: z.number().positive().default(1),
    values: z.array(z.string().min(1)).min(1).optional(),
    pattern: z.string().min(1).optional(),
    value: z.number().finite().optional(),
    tolerance: z.number().nonnegative().optional(),
    ids: z.array(z.string().min(1)).min(1).optional(),
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
  })
  .strict()
  .superRefine((check, context) => {
    if (["contains_all", "contains_any", "not_contains"].includes(check.kind) && !check.values) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `${check.kind} requires values` });
    }
    if (["regex", "not_regex", "regex_count"].includes(check.kind) && !check.pattern) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `${check.kind} requires pattern` });
    }
    if (["numeric", "max_chars"].includes(check.kind) && check.value === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `${check.kind} requires value` });
    }
    if (check.kind === "citation_ids" && !check.ids) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "citation_ids requires ids" });
    }
    if (check.kind === "regex_count" && check.min === undefined && check.max === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "regex_count requires min or max" });
    }
  });

const LearnerContextSchema = z
  .object({
    priorKnowledge: z.array(z.string()).default([]),
    misconceptions: z.array(z.string()).default([]),
    preferences: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
  })
  .strict();

const SourceSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9._-]+$/),
    title: z.string().min(1),
    content: z.string().min(1),
    origin: z.string().min(1).optional(),
  })
  .strict();

const FollowUpSchema = z
  .object({
    prompt: z.string().min(1),
    expectedAdaptation: z.string().min(1),
  })
  .strict();

const CaseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]+$/),
    language: z.enum(["zh-CN", "en"]),
    domain: z.enum(["mathematics", "physics", "chemistry", "computer_science", "biology", "economics"]),
    task: z.enum(["solve", "explain", "source_grounded", "practice"]),
    tutorBenchTaskType: z.enum(["concept_understanding", "problem_solving", "application", "comparison"]).optional(),
    learnerProfileId: z.string().regex(/^[a-z0-9][a-z0-9._-]+$/).optional(),
    knowledgeBaseId: z.string().regex(/^[a-z0-9][a-z0-9._-]+$/).optional(),
    prompt: z.string().min(1),
    learnerContext: LearnerContextSchema,
    sources: z.array(SourceSchema).default([]),
    followUps: z.array(FollowUpSchema).max(3).default([]),
    checks: z.array(CheckSchema).min(1),
  })
  .strict()
  .superRefine((item, context) => {
    const sourceIds = new Set(item.sources.map((source) => source.id));
    const checkIds = new Set();
    for (const check of item.checks) {
      if (checkIds.has(check.id)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate check id ${check.id}` });
      }
      checkIds.add(check.id);
      if (check.kind === "citation_ids") {
        for (const id of check.ids ?? []) {
          if (!sourceIds.has(id)) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: `citation check references unknown source ${id}` });
          }
        }
      }
    }
  });

export const TutorBenchmarkDatasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    benchmarkId: z.string().min(1),
    description: z.string().min(1),
    casePassThreshold: z.number().min(0).max(1),
    dimensionWeights: z.record(z.number().nonnegative()),
    dimensionMinimums: z.record(z.number().min(0).max(1)).default({}),
    cases: z.array(CaseSchema).min(1),
  })
  .strict()
  .superRefine((dataset, context) => {
    const ids = new Set();
    for (const item of dataset.cases) {
      if (ids.has(item.id)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate case id ${item.id}` });
      }
      ids.add(item.id);
    }
    const keys = Object.keys(dataset.dimensionWeights);
    const unknown = keys.filter((key) => !TUTOR_BENCHMARK_DIMENSIONS.includes(key));
    const unknownMinimums = Object.keys(dataset.dimensionMinimums).filter(
      (key) => !TUTOR_BENCHMARK_DIMENSIONS.includes(key),
    );
    const missing = TUTOR_BENCHMARK_DIMENSIONS.filter((key) => !(key in dataset.dimensionWeights));
    const sum = Object.values(dataset.dimensionWeights).reduce((total, value) => total + value, 0);
    if (unknown.length) context.addIssue({ code: z.ZodIssueCode.custom, message: `unknown dimensions: ${unknown.join(", ")}` });
    if (unknownMinimums.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `unknown minimum dimensions: ${unknownMinimums.join(", ")}` });
    }
    if (missing.length) context.addIssue({ code: z.ZodIssueCode.custom, message: `missing dimensions: ${missing.join(", ")}` });
    if (Math.abs(sum - 1) > 1e-9) context.addIssue({ code: z.ZodIssueCode.custom, message: "dimension weights must sum to 1" });
  });

const ResponseSchema = z
  .object({
    caseId: z.string().min(1),
    response: z.string(),
    latencyMs: z.number().nonnegative().nullable().default(null),
    inputTokens: z.number().int().nonnegative().nullable().default(null),
    outputTokens: z.number().int().nonnegative().nullable().default(null),
    costUsd: z.number().nonnegative().nullable().default(null),
  })
  .strict();

export const TutorBenchmarkResponseSetSchema = z
  .object({
    schemaVersion: z.literal(1),
    benchmarkId: z.string().min(1),
    run: z
      .object({
        mode: z.enum(["live", "imported"]),
        startedAt: z.string().datetime(),
        provider: z.string().min(1).nullable(),
        model: z.string().min(1).nullable(),
      })
      .strict(),
    responses: z.array(ResponseSchema).min(1),
  })
  .strict()
  .superRefine((responseSet, context) => {
    const ids = new Set();
    for (const item of responseSet.responses) {
      if (ids.has(item.caseId)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate response case id ${item.caseId}` });
      }
      ids.add(item.caseId);
    }
  });

/** @param {string} value */
function normalize(value) {
  return value.normalize("NFKC").toLocaleLowerCase();
}

/** @param {string} pattern */
function compilePattern(pattern) {
  return new RegExp(pattern, "giu");
}

/** @param {string} response */
function extractCitations(response) {
  return [...response.matchAll(/\[source:([A-Za-z0-9._-]+)\]/g)].map((match) => match[1]);
}

/** @param {string} response */
function extractNumbers(response) {
  return [...response.matchAll(/[-+]?(?:\d+(?:,\d{3})*(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?/giu)]
    .map((match) => Number(match[0].replaceAll(",", "")))
    .filter(Number.isFinite);
}

/** @param {any} check @param {string} response @param {Set<string>} validSourceIds */
function runCheck(check, response, validSourceIds) {
  const text = normalize(response);
  let passed = false;
  let detail = "";
  if (check.kind === "contains_all") {
    const missing = check.values.filter((/** @type {string} */ value) => !text.includes(normalize(value)));
    passed = missing.length === 0;
    detail = passed ? "all required text found" : `missing: ${missing.join(", ")}`;
  } else if (check.kind === "contains_any") {
    passed = check.values.some((/** @type {string} */ value) => text.includes(normalize(value)));
    detail = passed ? "an accepted alternative was found" : `none found: ${check.values.join(", ")}`;
  } else if (check.kind === "not_contains") {
    const found = check.values.filter((/** @type {string} */ value) => text.includes(normalize(value)));
    passed = found.length === 0;
    detail = passed ? "forbidden text absent" : `found: ${found.join(", ")}`;
  } else if (check.kind === "regex") {
    passed = compilePattern(check.pattern).test(response);
    detail = passed ? "pattern matched" : `pattern did not match: ${check.pattern}`;
  } else if (check.kind === "not_regex") {
    passed = !compilePattern(check.pattern).test(response);
    detail = passed ? "forbidden pattern absent" : `forbidden pattern matched: ${check.pattern}`;
  } else if (check.kind === "numeric") {
    const tolerance = check.tolerance ?? 0;
    const numbers = extractNumbers(response);
    passed = numbers.some((number) => Math.abs(number - check.value) <= tolerance);
    detail = passed ? `numeric answer ${check.value} found` : `expected ${check.value} ± ${tolerance}; saw ${numbers.join(", ") || "none"}`;
  } else if (check.kind === "citation_ids") {
    const citations = extractCitations(response);
    const missing = check.ids.filter((/** @type {string} */ id) => !citations.includes(id));
    const unknown = citations.filter((id) => !validSourceIds.has(id));
    passed = missing.length === 0 && unknown.length === 0;
    detail = passed
      ? "required citations are present and valid"
      : `missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}`;
  } else if (check.kind === "regex_count") {
    const count = [...response.matchAll(compilePattern(check.pattern))].length;
    passed = (check.min === undefined || count >= check.min) && (check.max === undefined || count <= check.max);
    detail = `matched ${count}; expected ${check.min ?? 0}..${check.max ?? "∞"}`;
  } else if (check.kind === "max_chars") {
    passed = response.length <= check.value;
    detail = `${response.length} characters; maximum ${check.value}`;
  }
  return { id: check.id, dimension: check.dimension, description: check.description, weight: check.weight, passed, detail };
}

/** @param {number[]} values @param {number} percentile */
function percentile(values, percentile) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1);
  return sorted[index];
}

/** @param {unknown} rawDataset @param {unknown} rawResponseSet */
export function evaluateTutorBenchmark(rawDataset, rawResponseSet) {
  const dataset = TutorBenchmarkDatasetSchema.parse(rawDataset);
  const responseSet = TutorBenchmarkResponseSetSchema.parse(rawResponseSet);
  if (responseSet.benchmarkId !== dataset.benchmarkId) {
    throw new Error(`response benchmark ${responseSet.benchmarkId} does not match ${dataset.benchmarkId}`);
  }

  const responseByCase = new Map(responseSet.responses.map((item) => [item.caseId, item]));
  const knownCaseIds = new Set(dataset.cases.map((item) => item.id));
  const extraResponseIds = responseSet.responses.map((item) => item.caseId).filter((id) => !knownCaseIds.has(id));
  const dimensionTotals = new Map(TUTOR_BENCHMARK_DIMENSIONS.map((dimension) => [dimension, { earned: 0, possible: 0 }]));

  const cases = dataset.cases.map((item) => {
    const measured = responseByCase.get(item.id) ?? {
      caseId: item.id,
      response: "",
      latencyMs: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: null,
    };
    const checks = item.checks.map((check) => runCheck(check, measured.response, new Set(item.sources.map((source) => source.id))));
    /** @type {Record<string, number>} */
    const dimensions = {};
    for (const dimension of TUTOR_BENCHMARK_DIMENSIONS) {
      const matching = checks.filter((check) => check.dimension === dimension);
      if (!matching.length) continue;
      const possible = matching.reduce((total, check) => total + check.weight, 0);
      const earned = matching.filter((check) => check.passed).reduce((total, check) => total + check.weight, 0);
      dimensions[dimension] = earned / possible;
      const aggregate = dimensionTotals.get(dimension);
      if (!aggregate) throw new Error(`Unknown benchmark dimension ${dimension}`);
      aggregate.earned += earned;
      aggregate.possible += possible;
    }
    const activeWeight = Object.keys(dimensions).reduce((total, dimension) => total + dataset.dimensionWeights[dimension], 0);
    const score = activeWeight
      ? Object.entries(dimensions).reduce(
          (total, [dimension, value]) => total + value * dataset.dimensionWeights[dimension],
          0,
        ) / activeWeight
      : 0;
    const failedDimensionGates = Object.entries(dataset.dimensionMinimums)
      .filter(([dimension, minimum]) => dimensions[dimension] === undefined || dimensions[dimension] < minimum)
      .map(([dimension]) => dimension);
    return {
      caseId: item.id,
      language: item.language,
      domain: item.domain,
      task: item.task,
      tutorBenchTaskType: item.tutorBenchTaskType ?? null,
      learnerProfileId: item.learnerProfileId ?? null,
      knowledgeBaseId: item.knowledgeBaseId ?? null,
      missingResponse: !responseByCase.has(item.id),
      score,
      passed: score >= dataset.casePassThreshold && failedDimensionGates.length === 0,
      failedDimensionGates,
      dimensions,
      checks,
      measurement: {
        latencyMs: measured.latencyMs,
        inputTokens: measured.inputTokens,
        outputTokens: measured.outputTokens,
        costUsd: measured.costUsd,
      },
      response: measured.response,
    };
  });

  const dimensionScores = Object.fromEntries(
    [...dimensionTotals].map(([dimension, total]) => [dimension, total.possible ? total.earned / total.possible : null]),
  );
  const latencies = cases.map((item) => item.measurement.latencyMs).filter((value) => value !== null);
  const knownCosts = cases.map((item) => item.measurement.costUsd).filter((value) => value !== null);
  const inputTokens = cases.map((item) => item.measurement.inputTokens).filter((value) => value !== null);
  const outputTokens = cases.map((item) => item.measurement.outputTokens).filter((value) => value !== null);
  const passedCases = cases.filter((item) => item.passed).length;
  const missingResponseIds = cases.filter((item) => item.missingResponse).map((item) => item.caseId);

  return {
    schemaVersion: 1,
    benchmarkId: dataset.benchmarkId,
    evaluatedAt: new Date().toISOString(),
    run: responseSet.run,
    summary: {
      caseCount: cases.length,
      passedCases,
      passRate: passedCases / cases.length,
      meanScore: cases.reduce((total, item) => total + item.score, 0) / cases.length,
      qualityGatePassed: passedCases === cases.length && !missingResponseIds.length && !extraResponseIds.length,
      missingResponseIds,
      extraResponseIds,
      dimensionScores,
      operations: {
        latencySamples: latencies.length,
        latencyP50Ms: percentile(latencies, 50),
        latencyP95Ms: percentile(latencies, 95),
        inputTokens: inputTokens.length === cases.length ? inputTokens.reduce((total, value) => total + value, 0) : null,
        outputTokens: outputTokens.length === cases.length ? outputTokens.reduce((total, value) => total + value, 0) : null,
        knownCostUsd: knownCosts.reduce((total, value) => total + value, 0),
        unknownCostCases: cases.length - knownCosts.length,
      },
    },
    cases,
  };
}

/** @param {ReturnType<typeof evaluateTutorBenchmark>} report */
export function formatTutorBenchmarkMarkdown(report) {
  /** @param {number | null} value */
  const percent = (value) => (value === null ? "n/a" : `${(value * 100).toFixed(1)}%`);
  const lines = [
    `# ${report.benchmarkId}`,
    "",
    `- Run: ${report.run.mode} / ${report.run.provider ?? "unknown provider"} / ${report.run.model ?? "unknown model"}`,
    `- Evaluated: ${report.evaluatedAt}`,
    `- Quality gate: ${report.summary.qualityGatePassed ? "PASS" : "FAIL"}`,
    `- Cases: ${report.summary.passedCases}/${report.summary.caseCount} passed`,
    `- Mean deterministic score: ${percent(report.summary.meanScore)}`,
    "",
    "## Dimensions",
    "",
    "| Dimension | Score |",
    "| --- | ---: |",
    ...Object.entries(report.summary.dimensionScores).map(([dimension, score]) => `| ${dimension} | ${percent(score)} |`),
    "",
    "## Operations",
    "",
    `- Latency p50 / p95: ${report.summary.operations.latencyP50Ms ?? "n/a"} ms / ${report.summary.operations.latencyP95Ms ?? "n/a"} ms`,
    `- Input / output tokens: ${report.summary.operations.inputTokens ?? "n/a"} / ${report.summary.operations.outputTokens ?? "n/a"}`,
    `- Known cost: $${report.summary.operations.knownCostUsd.toFixed(6)}; unknown cost cases: ${report.summary.operations.unknownCostCases}`,
    "",
    "## Cases",
    "",
    "| Case | Domain | Task | Score | Result |",
    "| --- | --- | --- | ---: | --- |",
    ...report.cases.map(
      (item) => `| ${item.caseId} | ${item.domain} | ${item.task} | ${percent(item.score)} | ${item.passed ? "PASS" : "FAIL"} |`,
    ),
  ];

  const failures = report.cases.flatMap((item) =>
    item.checks.filter((check) => !check.passed).map((check) => `- **${item.caseId} / ${check.id}**: ${check.description} — ${check.detail}`),
  );
  if (failures.length) lines.push("", "## Failed checks", "", ...failures);
  if (report.summary.missingResponseIds.length) {
    lines.push("", `Missing responses: ${report.summary.missingResponseIds.join(", ")}`);
  }
  if (report.summary.extraResponseIds.length) {
    lines.push("", `Unexpected responses: ${report.summary.extraResponseIds.join(", ")}`);
  }
  lines.push(
    "",
    "> Scores are deterministic contract checks, not a substitute for expert review, learner studies, or an LLM judge.",
    "",
  );
  return lines.join("\n");
}
