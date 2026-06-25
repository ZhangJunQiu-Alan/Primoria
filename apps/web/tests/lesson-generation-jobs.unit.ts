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

const CONCEPTS = ["c1", "c2", "c3", "c4"];
const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "g1",
  startTopic: {
    topicId: "t1",
    name: "导数",
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

const fixedIr = {
  v: 1,
  lesson: ["导数入门", 45],
  blocks: [
    [1, "T", "hook", ["c1"], "hook"],
    [2, "T", "roadmap", CONCEPTS, "roadmap"],
    [3, "T", "explanation", ["c1"], "explain c1"],
    [4, "C", "example", ["c1"], "example c1"],
    [5, "T", "explanation", ["c2"], "explain c2"],
    [6, "T", "example", ["c2"], "example c2"],
    [7, "T", "explanation", ["c3"], "explain c3"],
    [8, "C", "example", ["c3"], "example c3"],
    [9, "T", "explanation", ["c4"], "explain c4"],
    [10, "C", "example", ["c4"], "example c4"],
    [11, "A", "deepening", ["c1"], "analogy"],
    [12, "V", "deepening", ["c2"], "visual"],
    [13, "X", "transfer", CONCEPTS, "transfer"],
    [14, "Q", "assessment", CONCEPTS, "quiz"],
    [15, "T", "summary", CONCEPTS, "summary"],
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
  assert(keys.includes("batch:concept:c1:3-4-11"), "concept batch key pins primary concept + orders");
  assert(keys.includes("batch:transfer:13"), "transfer batch key");
  assert(keys.includes("batch:quiz:14"), "quiz batch key");
  assert(keys.includes("batch:summary:15"), "summary batch key");
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
