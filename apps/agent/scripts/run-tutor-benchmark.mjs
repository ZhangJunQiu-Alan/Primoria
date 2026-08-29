#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TutorBenchmarkDatasetSchema,
  TutorBenchmarkResponseSetSchema,
  evaluateTutorBenchmark,
  formatTutorBenchmarkMarkdown,
} from "../src/evaluation/tutor-benchmark.mjs";

const DEFAULT_DATASET_PATH = fileURLToPath(new URL("../evals/tutor-benchmark.v1.json", import.meta.url));
const DEFAULT_OUTPUT_DIR = fileURLToPath(new URL("../.eval-results/tutor-benchmark", import.meta.url));
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function resolveInputPath(value) {
  const fromCurrentDirectory = resolve(value);
  if (existsSync(fromCurrentDirectory)) return fromCurrentDirectory;
  return resolve(REPOSITORY_ROOT, value);
}

function usage() {
  return `Usage:
  node scripts/run-tutor-benchmark.mjs --validate-only
  node scripts/run-tutor-benchmark.mjs --responses <responses.json> [--output <dir>]
  PRIMORIA_TUTOR_BENCH_LIVE=1 node scripts/run-tutor-benchmark.mjs --live [--case <id>] [--limit <n>]

Options:
  --dataset <path>       Override the fixed benchmark dataset.
  --responses <path>     Score imported responses without calling a model.
  --live                 Call the configured Agent model sequentially.
  --case <id>            Run one case (repeatable).
  --limit <n>            Run only the first n selected cases.
  --output <dir>         Report directory (default: apps/agent/.eval-results/tutor-benchmark).
  --allow-failures       Return exit code 0 even when the quality gate fails.
  --validate-only        Validate the dataset and exit without model calls.
`;
}

function parseArgs(argv) {
  const options = {
    dataset: DEFAULT_DATASET_PATH,
    responses: null,
    live: false,
    cases: [],
    limit: null,
    output: DEFAULT_OUTPUT_DIR,
    allowFailures: false,
    validateOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${arg} requires a value`);
      index += 1;
      return next;
    };
    if (arg === "--") continue;
    if (arg === "--dataset") options.dataset = resolveInputPath(value());
    else if (arg === "--responses") options.responses = resolveInputPath(value());
    else if (arg === "--live") options.live = true;
    else if (arg === "--case") options.cases.push(value());
    else if (arg === "--limit") options.limit = Number(value());
    else if (arg === "--output") options.output = resolve(value());
    else if (arg === "--allow-failures") options.allowFailures = true;
    else if (arg === "--validate-only") options.validateOnly = true;
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(usage());
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.responses && options.live) throw new Error("Choose either --responses or --live, not both");
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }
  return options;
}

function selectCases(dataset, selectedIds, limit) {
  const knownIds = new Set(dataset.cases.map((item) => item.id));
  const unknownIds = selectedIds.filter((id) => !knownIds.has(id));
  if (unknownIds.length) throw new Error(`Unknown case id(s): ${unknownIds.join(", ")}`);
  let cases = selectedIds.length ? dataset.cases.filter((item) => selectedIds.includes(item.id)) : dataset.cases;
  if (limit !== null) cases = cases.slice(0, limit);
  return { ...dataset, cases };
}

function contentToText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  return content.map((part) => (typeof part === "string" ? part : String(part?.text ?? ""))).join("\n");
}

function benchmarkContext(item) {
  const learner = Object.entries(item.learnerContext)
    .map(([key, values]) => `${key}: ${values.length ? values.join("; ") : "none"}`)
    .join("\n");
  const sources = item.sources.length
    ? item.sources.map((source) => `[source:${source.id}] ${source.title}\n${source.content}`).join("\n\n")
    : "No supplied sources.";
  return `

BENCHMARK CONTEXT — hidden synthetic context for answer-quality evaluation.
Use it to tailor the answer, but never mention this block, its field names, or that a benchmark is running.
Learner context:
${learner}

Supplied sources:
${sources}

When the user requests a citation, cite only supplied sources using the exact token [source:<id>].
Do not invent citations. Follow the user's requested depth and format.`;
}

async function runLive(dataset) {
  if (process.env.PRIMORIA_TUTOR_BENCH_LIVE !== "1") {
    throw new Error("Live model calls are locked. Set PRIMORIA_TUTOR_BENCH_LIVE=1 explicitly to authorize API usage.");
  }
  const [{ HumanMessage, SystemMessage }, { createModel }, { SYSTEM_PROMPT }] = await Promise.all([
    import("@langchain/core/messages"),
    import("../src/model.mjs"),
    import("../src/prompts.mjs"),
  ]);
  const model = createModel({ streaming: false });
  const responses = [];
  for (const [index, item] of dataset.cases.entries()) {
    process.stdout.write(`[${index + 1}/${dataset.cases.length}] ${item.id} ... `);
    const started = performance.now();
    const message = await model.invoke([
      new SystemMessage(`${SYSTEM_PROMPT}${benchmarkContext(item)}`),
      new HumanMessage(item.prompt),
    ]);
    const latencyMs = Math.round(performance.now() - started);
    const usage = message?.usage_metadata ?? {};
    const rawUsage = message?.response_metadata?.usage ?? {};
    responses.push({
      caseId: item.id,
      response: contentToText(message?.content),
      latencyMs,
      inputTokens: usage.input_tokens ?? rawUsage.prompt_tokens ?? null,
      outputTokens: usage.output_tokens ?? rawUsage.completion_tokens ?? null,
      costUsd: null,
    });
    process.stdout.write(`${latencyMs}ms\n`);
  }
  const provider = process.env.AI_PROVIDER || "openai-compatible";
  const modelName = provider === "anthropic-compatible"
    ? process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest"
    : process.env.OPENAI_MODEL || "gpt-5.4";
  return {
    schemaVersion: 1,
    benchmarkId: dataset.benchmarkId,
    run: { mode: "live", startedAt: new Date().toISOString(), provider, model: modelName },
    responses,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const datasetText = await readFile(options.dataset, "utf8");
  const parsedDataset = TutorBenchmarkDatasetSchema.parse(JSON.parse(datasetText));
  const dataset = selectCases(parsedDataset, options.cases, options.limit);
  process.stdout.write(`Validated ${dataset.cases.length} cases from ${dataset.benchmarkId}.\n`);

  if (options.validateOnly || (!options.responses && !options.live)) {
    if (!options.validateOnly) {
      process.stdout.write("No response source selected; validation completed with zero model calls. Use --responses or the locked --live mode to score answers.\n");
    }
    return;
  }

  let responseSet;
  if (options.responses) {
    const parsed = TutorBenchmarkResponseSetSchema.parse(JSON.parse(await readFile(options.responses, "utf8")));
    if (options.cases.length || options.limit !== null) {
      const selectedIds = new Set(dataset.cases.map((item) => item.id));
      responseSet = { ...parsed, responses: parsed.responses.filter((item) => selectedIds.has(item.caseId)) };
    } else {
      responseSet = parsed;
    }
  } else {
    responseSet = await runLive(dataset);
  }

  const report = evaluateTutorBenchmark(dataset, responseSet);
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const prefix = resolve(options.output, `${dataset.benchmarkId}-${timestamp}`);
  await mkdir(dirname(prefix), { recursive: true });
  const reportWithHash = {
    ...report,
    datasetSha256: createHash("sha256").update(datasetText).digest("hex"),
  };
  await Promise.all([
    writeFile(`${prefix}.json`, `${JSON.stringify(reportWithHash, null, 2)}\n`, "utf8"),
    writeFile(`${prefix}.md`, formatTutorBenchmarkMarkdown(report), "utf8"),
  ]);
  process.stdout.write(`Report: ${prefix}.json\nReport: ${prefix}.md\n`);
  process.stdout.write(
    `${report.summary.passedCases}/${report.summary.caseCount} cases passed; mean score ${(report.summary.meanScore * 100).toFixed(1)}%.\n`,
  );
  if (!report.summary.qualityGatePassed && !options.allowFailures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
