#!/usr/bin/env tsx

import { compileLessonPlanIr } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
import { batchBlockJobs, batchCheckpointKey } from "../src/lib/ai/course-generation/block-writer.ts";
import {
  CURRENT_CHECKPOINT_VERSIONS,
  IR_VERSION,
  isCheckpointCompatible,
} from "../src/lib/ai/course-generation/versions.ts";
import {
  classifyGenerationError,
  ContextError,
  CoverageError,
  LeaseLostError,
  ProviderError,
  WriterError,
} from "../src/lib/ai/course-generation/generation-errors.ts";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const CONCEPTS = ["c1", "c2", "c3"];
const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "biology",
  startTopic: {
    topicId: "t1",
    name: "Photosynthesis",
    concepts: CONCEPTS.map((conceptId, index) => ({
      conceptId,
      name: `概念${index + 1}`,
      defaultOrder: index + 1,
      ...(conceptId === "c2" ? { visual: "function" as const, visualHint: "plot it" } : {}),
    })),
  },
  targetConceptId: "c1",
  nextTopic: null,
};

const WI = "give the writer a concrete angle for this block";
const fixedIr = {
  v: 2,
  lesson: ["光合作用入门", 45],
  blocks: [
    [1, "T", "hook", ["c1"], "hook", WI],
    [2, "T", "roadmap", CONCEPTS, "roadmap", WI],
    [3, "T", "explanation", ["c1"], "explain c1", WI],
    [4, "V", "example", ["c1"], "visual example c1", WI],
    [5, "V", "deepening", ["c1"], "visual c1", WI],
    [6, "Q", "assessment", ["c1"], "quiz c1", WI],
    [7, "T", "explanation", ["c2"], "explain c2", WI],
    [8, "T", "example", ["c2"], "example c2", WI],
    [9, "V", "deepening", ["c2"], "visual c2", WI],
    [10, "Q", "assessment", ["c2"], "quiz c2", WI],
    [11, "T", "explanation", ["c3"], "explain c3", WI],
    [12, "V", "example", ["c3"], "visual example c3", WI],
    [13, "V", "deepening", ["c3"], "visual c3", WI],
    [14, "Q", "assessment", ["c3"], "quiz c3", WI],
    [15, "V", "transfer", CONCEPTS, "transfer simulation", WI],
    [16, "T", "summary", CONCEPTS, "summary", WI],
  ],
};

function main() {
  // ── Deterministic checkpoint keys (doc §4.2) ───────────────────────────────
  const plan = compileLessonPlanIr(fixedIr, kg);
  const keys = batchBlockJobs(plan.jobs).map(batchCheckpointKey);
  // Recompiling from scratch (a "restart") yields identical keys.
  const keysAgain = batchBlockJobs(compileLessonPlanIr(fixedIr, kg).jobs).map(batchCheckpointKey);
  assert(keys.join(",") === keysAgain.join(","), "batch checkpoint keys are stable across recompilation");

  assert(keys.includes("batch:activation:1-2"), "activation batch key includes its orders");
  assert(keys.includes("batch:concept:c1:3-4-5"), "concept batch key pins primary concept + orders");
  assert(keys.includes("batch:transfer:15"), "transfer batch key");
  assert(keys.includes("batch:quiz:6"), "first concept quiz batch key");
  assert(keys.includes("batch:quiz:10"), "second concept quiz batch key");
  assert(keys.includes("batch:quiz:14"), "third concept quiz batch key");
  assert(keys.includes("batch:summary:16"), "summary batch key");
  assert(new Set(keys).size === keys.length, "all batch keys are unique");

  // ── Version compatibility (doc §9.2/§9.3) ──────────────────────────────────
  assert(isCheckpointCompatible(CURRENT_CHECKPOINT_VERSIONS), "current versions are compatible");
  assert(!isCheckpointCompatible({ ...CURRENT_CHECKPOINT_VERSIONS, irVersion: IR_VERSION + 1 }), "ir mismatch invalidates");
  assert(!isCheckpointCompatible({ ...CURRENT_CHECKPOINT_VERSIONS, promptVersion: "old" }), "prompt mismatch invalidates");
  assert(!isCheckpointCompatible({ ...CURRENT_CHECKPOINT_VERSIONS, compilerVersion: "old" }), "compiler mismatch invalidates");

  // ── Error classification & retryability (doc §10.2) ────────────────────────
  assert(classifyGenerationError(new CoverageError("x", [])).retryable, "coverage is retryable");
  assert(classifyGenerationError(new WriterError("x")).retryable, "writer is retryable");
  assert(classifyGenerationError(new ProviderError("x")).retryable, "provider is retryable");
  assert(classifyGenerationError(new LeaseLostError()).category === "lease_lost", "lease_lost category preserved");
  assert(!classifyGenerationError(new ContextError("missing")).retryable, "context is non-retryable");
  assert(classifyGenerationError(new Error("fetch failed: socket hang up")).category === "provider", "network shape -> provider");
  assert(classifyGenerationError(new Error("fetch failed")).retryable, "network shape is retryable");
  assert(!classifyGenerationError(new Error("totally unknown bug")).retryable, "unknown error is non-retryable");

  process.stdout.write("[lesson-generation-jobs.unit] ALL CHECKS PASSED\n");
}

main();
