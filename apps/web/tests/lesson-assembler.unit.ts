#!/usr/bin/env tsx

import { generateLessonFromKg, hasUsableKgConcepts } from "../src/lib/ai/course-generation/lesson-assembler.ts";
import { validateLessonBlocks } from "../src/lib/ai/course-generation/lesson-validator.ts";
import { LessonValidationError } from "../src/lib/ai/course-generation/generation-errors.ts";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function assertRejects(run: () => Promise<unknown>, ErrorClass: new (...a: never[]) => Error, message: string) {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof ErrorClass, `${message} (got ${caught?.constructor?.name ?? "no throw"})`);
}

const CONCEPTS = ["c1", "c2", "c3", "c4"];

const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "g1",
  startTopic: {
    topicId: "t1",
    name: "导数",
    concepts: CONCEPTS.map((conceptId, index) => ({ conceptId, name: `概念${index + 1}`, defaultOrder: index + 1 })),
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

function contentFor(j: { order: number; type: string }) {
  const order = j.order;
  switch (j.type) {
    case "analogy":
      return { order, title: `a${order}`, source: "s", target: "t", mapping: "m" };
    case "transfer":
      return { order, title: `x${order}`, fromDomain: "f", toDomain: "to", explanation: "e", example: "ex" };
    case "code":
      return { order, title: `c${order}`, language: "python", code: "print(1)", explanation: "e" };
    case "visual":
      return { order, title: `v${order}`, description: "d", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
    case "quiz":
      return {
        order,
        title: `q${order}`,
        questions: CONCEPTS.map((_, i) => ({
          kind: "single",
          id: `q${i + 1}`,
          question: `q${i + 1}?`,
          choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
          correctId: "a",
        })),
      };
    default:
      return { order, title: `t${order}`, markdown: `body ${order}` };
  }
}

async function main() {
  assert(hasUsableKgConcepts(kg), "kg with concepts is usable");
  assert(!hasUsableKgConcepts(undefined), "missing kg is not usable");
  assert(
    !hasUsableKgConcepts({ ...kg, startTopic: { ...kg.startTopic, concepts: [] } }),
    "kg with no concepts is not usable",
  );

  // Full pipeline with mocked planner + writer
  const lesson = await generateLessonFromKg(kg, "L1", {
    plannerInvoke: async () => fixedIr,
    writerInvoke: async ({ batch }) => batch.jobs.map((j) => contentFor(j)),
  });
  assert(lesson.blocks.length === 15, "assembles 15 blocks");
  assert(lesson.title === "导数入门", "lesson title from plan");
  assert(lesson.estimatedMinutes === 45, "minutes from plan");
  assert(lesson.blocks.every((b) => b.id.startsWith("blk_L1_")), "stable namespaced block ids");
  assert(lesson.blocks.every((b) => (b.conceptIds?.length ?? 0) >= 1), "every block carries conceptIds");
  assert(validateLessonBlocks(lesson.blocks, CONCEPTS).ok, "assembled lesson passes validation");

  // Idempotency: same lessonId + same plan -> identical block ids (retry-safe)
  const again = await generateLessonFromKg(kg, "L1", {
    plannerInvoke: async () => fixedIr,
    writerInvoke: async ({ batch }) => batch.jobs.map((j) => contentFor(j)),
  });
  assert(
    again.blocks.map((b) => b.id).join(",") === lesson.blocks.map((b) => b.id).join(","),
    "regeneration reuses stable block ids",
  );

  // Validator catches a quiz that drops a concept
  const quizGap = lesson.blocks.map((b) =>
    b.type === "quiz" ? { ...b, conceptIds: ["c1", "c2", "c3"] } : b,
  );
  const result = validateLessonBlocks(quizGap, CONCEPTS);
  assert(!result.ok && result.missing.some((m) => m.startsWith("quiz-concept:c4")), "validator flags quiz concept gap");

  // A writer that emits duplicate titles (its content, not job metadata) fails
  // final validation — the deterministic guard the writer can actually break.
  await assertRejects(
    async () =>
      generateLessonFromKg(kg, "L1", {
        plannerInvoke: async () => fixedIr,
        writerInvoke: async ({ batch }) =>
          batch.jobs.map((j) => (j.type === "text" ? { ...contentFor(j), title: "重复标题" } : contentFor(j))),
      }),
    LessonValidationError,
    "duplicate block titles fail validation",
  );

  process.stdout.write("[lesson-assembler.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
