#!/usr/bin/env tsx

import { isLessonGenerationActive, lessonGenerationStageLabel } from "../src/lib/courses/lesson-generation-labels.ts";
import type { LessonGenerationJobSummary } from "../src/lib/courses/lesson-generation-jobs.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function job(partial: Partial<LessonGenerationJobSummary>): LessonGenerationJobSummary {
  return {
    id: "ljob",
    courseId: "crs",
    lessonId: "lsn",
    status: "running",
    stage: "queued",
    attempts: 1,
    maxAttempts: 2,
    progressCompleted: 0,
    progressTotal: 0,
    lastError: null,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

function main() {
  // Stage labels (engineering doc §13.2) — single source of truth.
  assert(lessonGenerationStageLabel(job({ stage: "queued" })) === "Waiting to generate", "queued label");
  assert(lessonGenerationStageLabel(job({ stage: "planning" })) === "Planning lesson", "planning label");
  assert(
    lessonGenerationStageLabel(job({ stage: "writing", progressCompleted: 4, progressTotal: 9 })) === "Writing blocks 4/9",
    "writing label shows X/Y",
  );
  assert(lessonGenerationStageLabel(job({ stage: "validating" })) === "Checking lesson quality", "validating label");
  assert(lessonGenerationStageLabel(job({ stage: "saving" })) === "Saving lesson", "saving label");
  assert(lessonGenerationStageLabel(job({ stage: "completed" })) === "Ready", "completed label");
  assert(lessonGenerationStageLabel(job({ stage: "failed" })) === "Generation failed", "failed label");

  // Writing label never divides by zero before the plan is compiled.
  assert(lessonGenerationStageLabel(job({ stage: "writing", progressCompleted: 0, progressTotal: 0 })) === "Writing blocks 0/1", "writing label guards total>=1");

  // Active = polling continues (doc §13.1).
  assert(isLessonGenerationActive(job({ status: "queued" })), "queued is active");
  assert(isLessonGenerationActive(job({ status: "running" })), "running is active");
  assert(!isLessonGenerationActive(job({ status: "completed" })), "completed is not active (polling stops)");
  assert(!isLessonGenerationActive(job({ status: "failed" })), "failed is not active (polling stops)");

  process.stdout.write("[lesson-generation-labels.unit] ALL CHECKS PASSED\n");
}

main();
