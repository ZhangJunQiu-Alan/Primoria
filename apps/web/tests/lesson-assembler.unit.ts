#!/usr/bin/env tsx

import { generateLessonFromKg, hasUsableKgConcepts } from "../src/lib/ai/course-generation/lesson-assembler.ts";
import { validateLessonBlocks } from "../src/lib/ai/course-generation/lesson-validator.ts";
import { LessonValidationError } from "../src/lib/ai/course-generation/generation-errors.ts";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context.ts";
import type { CourseBlock } from "../src/lib/courses/types.ts";

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
        questions: CONCEPTS.map((conceptId, i) => ({
          kind: "single",
          id: `q${i + 1}`,
          question: `q${i + 1}?`,
          choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
          correctId: "a",
          conceptId,
        })),
      };
    default:
      return { order, title: `t${order}`, markdown: `body ${order}` };
  }
}

function quizBlock(order: number): CourseBlock {
  return {
    id: `b${order}`,
    type: "quiz",
    title: `quiz ${order}`,
    conceptIds: CONCEPTS,
    pedagogicalRole: "assessment",
    questions: CONCEPTS.map((conceptId, index) => ({
      kind: "single",
      id: `q${index + 1}`,
      question: `question ${index + 1}`,
      choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctId: "a",
      conceptId,
    })),
  };
}

function validatorBlock(
  order: number,
  type: CourseBlock["type"],
  role: NonNullable<CourseBlock["pedagogicalRole"]>,
  conceptIds: string[],
): CourseBlock {
  const base = { id: `b${order}`, title: `${type} ${order}`, conceptIds, pedagogicalRole: role };
  if (type === "text") return { ...base, type, markdown: `body ${order}` };
  if (type === "code") return { ...base, type, language: "python", code: "print(1)", explanation: "e" };
  if (type === "analogy") return { ...base, type, source: "source", target: "target", mapping: "mapping" };
  if (type === "visual") return { ...base, type, description: "visual", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
  if (type === "transfer") return { ...base, type, fromDomain: "from", toDomain: "to", explanation: "e", example: "ex" };
  throw new Error(`unsupported validator test block type ${type}`);
}

function finalValidatorBaseBlocks(): CourseBlock[] {
  return [
    validatorBlock(1, "text", "hook", ["c1"]),
    validatorBlock(2, "text", "roadmap", CONCEPTS),
    validatorBlock(3, "text", "explanation", ["c1"]),
    validatorBlock(4, "code", "example", ["c1"]),
    validatorBlock(5, "text", "explanation", ["c2"]),
    validatorBlock(6, "code", "example", ["c2"]),
    validatorBlock(7, "text", "explanation", ["c3"]),
    validatorBlock(8, "code", "example", ["c3"]),
    validatorBlock(9, "text", "explanation", ["c4"]),
    validatorBlock(10, "code", "example", ["c4"]),
    validatorBlock(11, "analogy", "deepening", ["c1"]),
    validatorBlock(12, "analogy", "deepening", ["c2"]),
    validatorBlock(13, "transfer", "transfer", CONCEPTS),
    quizBlock(14),
    validatorBlock(15, "text", "summary", CONCEPTS),
  ];
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

  const zeroVisual = finalValidatorBaseBlocks();
  assert(validateLessonBlocks(zeroVisual, CONCEPTS).ok, "final validator accepts a valid lesson with no visual blocks");

  const twoVisuals = finalValidatorBaseBlocks();
  twoVisuals.splice(12, 0, validatorBlock(16, "visual", "deepening", ["c1"]));
  twoVisuals.splice(13, 0, validatorBlock(17, "visual", "deepening", ["c2"]));
  const twoVisualResult = validateLessonBlocks(twoVisuals, CONCEPTS);
  assert(
    twoVisualResult.ok,
    `final validator accepts 17 blocks when two visual blocks are present; got ${
      twoVisualResult.ok ? "ok" : twoVisualResult.missing.join(",")
    }`,
  );

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
