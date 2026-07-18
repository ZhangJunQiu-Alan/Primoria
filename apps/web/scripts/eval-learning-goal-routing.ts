import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { buildConceptFrontierOutline } from "../src/lib/knowledge-graph/concept-frontier";
import { buildGraphCandidates } from "../src/lib/knowledge-graph/graph-router";
import {
  positionLearningGoal,
  type PositionLearningGoalResult,
} from "../src/lib/knowledge-graph/position-learning-goal";
import { getKnowledgeGraphPool } from "../src/lib/knowledge-graph/search";
import { getTopicGraph } from "../src/lib/knowledge-graph/topic-graph";
import { loadLocalEnv } from "./load-local-env";

const BranchSchema = z.enum(["positioned", "clarify_subject", "out_of_library", "fallback"]);
const ModeSchema = z.enum(["specific", "subject_start", "directed", "goal_scoped"]);
const CategorySchema = z.enum([
  "library_broad",
  "library_topic",
  "library_concept",
  "library_boundary",
  "out_of_library",
  "multi_scope",
  "ambiguous",
  "invalid_or_vague",
]);

const ExpectationSchema = z.object({
  branches: z.array(BranchSchema).min(1),
  graphIds: z.array(z.string().min(1)).min(1).optional(),
  modes: z.array(ModeSchema).min(1).optional(),
  startTopicIds: z.array(z.string().min(1)).min(1).optional(),
  targetConceptIds: z.array(z.string().min(1)).min(1).optional(),
  candidateGraphIds: z.array(z.string().min(1)).min(1).optional(),
});

const CaseSchema = z.object({
  id: z.string().min(1),
  category: CategorySchema,
  split: z.enum(["dev", "test"]),
  suite: z.enum(["core", "challenge", "regression"]),
  input: z.string().min(2),
  language: z.enum(["en", "zh"]),
  expect: ExpectationSchema,
  policy: z.object({
    coverage: z.enum(["full_single_graph", "full_multi_graph", "partial", "none", "ambiguous", "invalid"]),
    action: z.enum(["canonical_kg", "composed_kg", "hybrid_graph", "generated_graph", "clarify", "fallback"]),
    scope: z.enum(["full_graph", "topic_closure", "concept_closure", "goal_subgraph", "generated_graph", "not_applicable"]),
    sourceGraphIds: z.array(z.string().min(1)).min(1).optional(),
    mustIncludeConceptIds: z.array(z.string().min(1)).min(1).optional(),
    mustExcludeConceptIds: z.array(z.string().min(1)).min(1).optional(),
  }),
  reference: z
    .object({ graphId: z.string().min(1).optional(), topicId: z.string().min(1).optional(), conceptId: z.string().min(1).optional() })
    .optional(),
  origin: z.object({
    kind: z.enum(["kg_template", "manual_seed"]),
    sourceId: z.string().min(1),
    templateId: z.string().min(1),
  }),
  tags: z.array(z.string().min(1)),
});

const FixtureSchema = z.object({
  version: z.literal(2),
  datasetId: z.string().min(1),
  description: z.string().min(1),
  sourceSummary: z.object({ graphCount: z.number().int().positive(), topicCount: z.number().int().positive(), conceptCount: z.number().int().positive() }),
  stats: z.object({
    total: z.number().int().positive(),
    byCategory: z.record(z.string(), z.number().int().nonnegative()),
    byLanguage: z.record(z.string(), z.number().int().nonnegative()),
    bySplit: z.record(z.string(), z.number().int().nonnegative()),
    bySuite: z.record(z.string(), z.number().int().nonnegative()),
    byPolicyAction: z.record(z.string(), z.number().int().nonnegative()),
    byPolicyScope: z.record(z.string(), z.number().int().nonnegative()),
  }),
  cases: z.array(CaseSchema).min(500),
});

type EvalCase = z.infer<typeof CaseSchema>;

function readOption(name: string) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return exact?.slice(name.length + 1);
}

function optionSet(name: string) {
  return new Set((readOption(name) ?? "").split(",").filter(Boolean));
}

function hash(value: string) {
  let current = 2166136261;
  for (const char of value) {
    current ^= char.codePointAt(0) ?? 0;
    current = Math.imul(current, 16777619);
  }
  return current >>> 0;
}

function resultSummary(output: PositionLearningGoalResult) {
  const { result } = output;
  const candidates = buildGraphCandidates(output.search.results, 3, output.search.encodedQuery.coreQuery).map(
    (candidate) => `${candidate.graphId}:${candidate.bestSimilarity.toFixed(3)}`,
  );
  return {
    branch: result.branch,
    graphId: result.graphId || null,
    mode: result.branch === "positioned" ? result.mode ?? null : null,
    startTopicId: result.branch === "positioned" ? result.startTopicId ?? null : null,
    targetConceptId: result.branch === "positioned" ? result.targetConceptId ?? null : null,
    candidates,
    clarificationCandidates: result.candidates?.map((candidate) => candidate.graphId) ?? [],
  };
}

function checkExpectation(item: EvalCase, output: PositionLearningGoalResult) {
  const { result } = output;
  const failures: string[] = [];
  if (!item.expect.branches.includes(result.branch)) {
    failures.push(`branch expected ${item.expect.branches.join("|")}, got ${result.branch}`);
  }
  if (item.expect.graphIds && (!result.graphId || !item.expect.graphIds.includes(result.graphId))) {
    failures.push(`graph expected ${item.expect.graphIds.join("|")}, got ${result.graphId || "null"}`);
  }
  if (
    item.expect.modes &&
    (result.branch !== "positioned" || !result.mode || !item.expect.modes.includes(result.mode))
  ) {
    failures.push(
      `mode expected ${item.expect.modes.join("|")}, got ${result.branch === "positioned" ? result.mode ?? "null" : "n/a"}`,
    );
  }
  if (
    item.expect.startTopicIds &&
    (result.branch !== "positioned" || !result.startTopicId || !item.expect.startTopicIds.includes(result.startTopicId))
  ) {
    failures.push(
      `start topic expected ${item.expect.startTopicIds.join("|")}, got ${result.branch === "positioned" ? result.startTopicId ?? "null" : "n/a"}`,
    );
  }
  if (
    item.expect.targetConceptIds &&
    (result.branch !== "positioned" ||
      !result.targetConceptId ||
      !item.expect.targetConceptIds.includes(result.targetConceptId))
  ) {
    failures.push(
      `target concept expected ${item.expect.targetConceptIds.join("|")}, got ${result.branch === "positioned" ? result.targetConceptId ?? "null" : "n/a"}`,
    );
  }
  if (item.expect.candidateGraphIds && result.branch === "clarify_subject") {
    const actual = new Set(result.candidates?.map((candidate) => candidate.graphId) ?? []);
    const missing = item.expect.candidateGraphIds.filter((graphId) => !actual.has(graphId));
    if (missing.length > 0) failures.push(`clarification candidates missing ${missing.join(",")}`);
  }
  if (result.branch === "positioned") {
    const graph = getTopicGraph(result.graphId);
    const actualConceptIds = new Set(
      buildConceptFrontierOutline({
        graph,
        startTopicId: result.startTopicId ?? null,
        targetConceptId: result.targetConceptId ?? null,
        targetConceptIds: result.targetConceptIds,
        masteredConceptIds: new Set(),
      }).flatMap((bundle) => bundle.conceptIds),
    );
    for (const conceptId of item.policy.mustIncludeConceptIds ?? []) {
      if (!actualConceptIds.has(conceptId)) failures.push(`course scope missing required concept ${conceptId}`);
    }
    for (const conceptId of item.policy.mustExcludeConceptIds ?? []) {
      if (actualConceptIds.has(conceptId)) failures.push(`course scope contains excluded concept ${conceptId}`);
    }

    if (item.reference?.graphId === result.graphId && item.reference.topicId && item.policy.scope === "topic_closure") {
      const topic = graph.topics.find((candidate) => candidate.topicId === item.reference?.topicId);
      if (topic) {
        const expectedConceptIds = new Set(
          buildConceptFrontierOutline({
            graph,
            startTopicId: null,
            targetConceptId: null,
            targetConceptIds: topic.conceptIds.map((concept) => concept.conceptId),
            masteredConceptIds: new Set(),
          }).flatMap((bundle) => bundle.conceptIds),
        );
        const missing = [...expectedConceptIds].filter((id) => !actualConceptIds.has(id));
        const extra = [...actualConceptIds].filter((id) => !expectedConceptIds.has(id));
        if (missing.length > 0) failures.push(`topic closure missing ${missing.join(",")}`);
        if (extra.length > 0) failures.push(`topic closure contains unrelated ${extra.join(",")}`);
      }
    }

    if (item.reference?.graphId === result.graphId && item.reference.conceptId && item.policy.scope === "concept_closure") {
      const expectedConceptIds = new Set(
        buildConceptFrontierOutline({
          graph,
          startTopicId: null,
          targetConceptId: item.reference.conceptId,
          masteredConceptIds: new Set(),
        }).flatMap((bundle) => bundle.conceptIds),
      );
      const missing = [...expectedConceptIds].filter((id) => !actualConceptIds.has(id));
      const extra = [...actualConceptIds].filter((id) => !expectedConceptIds.has(id));
      if (missing.length > 0) failures.push(`concept closure missing ${missing.join(",")}`);
      if (extra.length > 0) failures.push(`concept closure contains unrelated ${extra.join(",")}`);
    }
  }
  return failures;
}

async function runCase(item: EvalCase) {
  const startedAt = Date.now();
  const output = await positionLearningGoal({ query: item.input, language: item.language, topK: 30 });
  const failures = checkExpectation(item, output);
  return { output, failures, elapsedMs: Date.now() - startedAt };
}

function matchesFilter(item: EvalCase) {
  const caseIds = optionSet("--case");
  const categories = optionSet("--category");
  const splits = optionSet("--split");
  const suites = optionSet("--suite");
  const languages = optionSet("--language");
  const graphs = optionSet("--graph");
  return (
    (caseIds.size === 0 || caseIds.has(item.id)) &&
    (categories.size === 0 || categories.has(item.category)) &&
    (splits.size === 0 || splits.has(item.split)) &&
    (suites.size === 0 || suites.has(item.suite)) &&
    (languages.size === 0 || languages.has(item.language)) &&
    (graphs.size === 0 || (item.reference?.graphId ? graphs.has(item.reference.graphId) : false))
  );
}

async function main() {
  const fixturePath = join(process.cwd(), "tests/fixtures/learning-goal-routing.v2.json");
  const fixture = FixtureSchema.parse(JSON.parse(readFileSync(fixturePath, "utf8")));
  if (fixture.stats.total !== fixture.cases.length) {
    throw new Error(`Fixture stats.total=${fixture.stats.total}, cases=${fixture.cases.length}`);
  }
  const duplicateIds = fixture.cases.filter(
    (item, index, cases) => cases.findIndex((candidate) => candidate.id === item.id) !== index,
  );
  if (duplicateIds.length > 0) throw new Error(`Duplicate case ids: ${duplicateIds.map((item) => item.id).join(", ")}`);

  if (process.argv.includes("--stats")) {
    process.stdout.write(`${JSON.stringify({ datasetId: fixture.datasetId, sourceSummary: fixture.sourceSummary, ...fixture.stats }, null, 2)}\n`);
    return;
  }
  if (process.argv.includes("--validate-only")) {
    process.stdout.write(`Validated ${fixture.cases.length} learning-goal routing cases.\n`);
    return;
  }

  let selected = fixture.cases.filter(matchesFilter);
  const rawLimit = readOption("--limit");
  const limit = rawLimit ? Number(rawLimit) : null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) throw new Error(`Invalid --limit=${rawLimit}`);
  if (limit !== null) selected = [...selected].sort((a, b) => hash(a.id) - hash(b.id)).slice(0, limit);
  if (selected.length === 0) throw new Error("No learning-goal routing cases matched the filters.");
  if (selected.length > 100 && !process.argv.includes("--all") && limit === null) {
    throw new Error(
      `Refusing to run ${selected.length} paid model cases without --all. Use --limit=N or filter by --case/--category/--split/--suite/--language/--graph.`,
    );
  }

  loadLocalEnv();
  let passed = 0;
  const categoryTotals = new Map<string, { passed: number; total: number }>();
  try {
    for (const item of selected) {
      const current = categoryTotals.get(item.category) ?? { passed: 0, total: 0 };
      current.total += 1;
      categoryTotals.set(item.category, current);
      try {
        const { output, failures, elapsedMs } = await runCase(item);
        const summary = resultSummary(output);
        if (failures.length === 0) {
          passed += 1;
          current.passed += 1;
          process.stdout.write(
            `ROUTE PASS ${item.id} ${elapsedMs}ms -> ${summary.branch}/${summary.graphId ?? "-"}/${summary.mode ?? "-"}/${summary.startTopicId ?? "-"} policy=${item.policy.action}/${item.policy.scope} stage1=[${summary.candidates.join(", ")}]\n`,
          );
        } else {
          process.stdout.write(
            `ROUTE FAIL ${item.id} ${elapsedMs}ms -> ${summary.branch}/${summary.graphId ?? "-"}/${summary.mode ?? "-"}/${summary.startTopicId ?? "-"}/${summary.targetConceptId ?? "-"} policy=${item.policy.action}/${item.policy.scope} stage1=[${summary.candidates.join(", ")}] clarify=[${summary.clarificationCandidates.join(", ")}]\n`,
          );
          for (const failure of failures) process.stdout.write(`  ${failure}\n`);
        }
      } catch (error) {
        process.stdout.write(`ERROR ${item.id}: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }
  } finally {
    await getKnowledgeGraphPool().end().catch(() => {});
  }

  process.stdout.write(
    `\n${passed}/${selected.length} routing and deterministic course-scope checks passed (${Math.round((passed / selected.length) * 100)}%).\n`,
  );
  for (const [name, counts] of categoryTotals) process.stdout.write(`  ${name}: ${counts.passed}/${counts.total}\n`);
  if (passed !== selected.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
