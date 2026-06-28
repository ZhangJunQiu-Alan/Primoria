#!/usr/bin/env tsx

import { LessonValidationError } from "../src/lib/ai/course-generation/generation-errors.ts";
import { generateLessonFromKg, hasUsableKgConcepts } from "../src/lib/ai/course-generation/lesson-assembler.ts";
import { validateLessonBlocks } from "../src/lib/ai/course-generation/lesson-validator.ts";
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
      ...(conceptId === "c2" ? { visual: "diagram" as const, visualHint: "show it" } : {}),
    })),
  },
  targetConceptId: "c1",
  nextTopic: null,
};

const fixedIr = {
  v: 1,
  lesson: ["光合作用入门", 45],
  blocks: [
    [1, "T", "hook", ["c1"], "hook"],
    [2, "T", "roadmap", CONCEPTS, "roadmap"],
    [3, "T", "explanation", ["c1"], "explain c1"],
    [4, "V", "example", ["c1"], "visual example c1"],
    [5, "V", "deepening", ["c1"], "visual c1"],
    [6, "Q", "assessment", ["c1"], "quiz c1"],
    [7, "T", "explanation", ["c2"], "explain c2"],
    [8, "T", "example", ["c2"], "example c2"],
    [9, "V", "deepening", ["c2"], "visual c2"],
    [10, "Q", "assessment", ["c2"], "quiz c2"],
    [11, "T", "explanation", ["c3"], "explain c3"],
    [12, "V", "example", ["c3"], "visual example c3"],
    [13, "V", "deepening", ["c3"], "visual c3"],
    [14, "Q", "assessment", ["c3"], "quiz c3"],
    [15, "V", "transfer", CONCEPTS, "transfer simulation"],
    [16, "T", "summary", CONCEPTS, "summary"],
  ],
};

function imageContent(order: number) {
  return {
    order,
    title: `i${order}`,
    learningGoal: "recognize the structure",
    imageKind: "structure_diagram",
    prompt: "A clean educational illustration with no labels",
    alt: "A structure illustration",
    caption: "Notice the structure.",
  };
}

function contentFor(j: { order: number; type: string; conceptIds?: string[] }, titleOverride?: string) {
  const order = j.order;
  const title = titleOverride ?? `${j.type}${order}`;
  switch (j.type) {
    case "analogy":
      return { order, title, source: "s", target: "t", mapping: "m" };
    case "transfer":
      return { order, title, fromDomain: "f", toDomain: "to", explanation: "e", example: "ex" };
    case "code":
      return { order, title, language: "python", code: "print(1)", explanation: "e" };
    case "image":
      return { ...imageContent(order), title };
    case "visual":
      return { order, title, description: "d", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
    case "quiz":
      return {
        order,
        title,
        questions: (j.conceptIds ?? []).map((conceptId, i) => ({
          kind: "single",
          id: `q${i + 1}`,
          question: `q${i + 1}?`,
          choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
          correctId: "a",
          conceptId,
        })),
      };
    default:
      return { order, title, markdown: `body ${order}` };
  }
}

function quizBlock(order: number, conceptId: string): CourseBlock {
  return {
    id: `b${order}`,
    type: "quiz",
    title: `quiz ${order}`,
    conceptIds: [conceptId],
    pedagogicalRole: "assessment",
    questions: [{
      kind: "single",
      id: `q${order}`,
      question: `question ${order}`,
      choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctId: "a",
      conceptId,
    }],
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
  if (type === "visual") return { ...base, type, description: "visual", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
  if (type === "transfer") return { ...base, type, fromDomain: "from", toDomain: "to", explanation: "e", example: "ex" };
  throw new Error(`unsupported validator test block type ${type}`);
}

function finalValidatorBaseBlocks(): CourseBlock[] {
  return [
    validatorBlock(1, "text", "hook", ["c1"]),
    validatorBlock(2, "text", "roadmap", CONCEPTS),
    validatorBlock(3, "text", "explanation", ["c1"]),
    validatorBlock(4, "visual", "example", ["c1"]),
    validatorBlock(5, "visual", "deepening", ["c1"]),
    quizBlock(6, "c1"),
    validatorBlock(7, "text", "explanation", ["c2"]),
    validatorBlock(8, "text", "example", ["c2"]),
    validatorBlock(9, "visual", "deepening", ["c2"]),
    quizBlock(10, "c2"),
    validatorBlock(11, "text", "explanation", ["c3"]),
    validatorBlock(12, "visual", "example", ["c3"]),
    validatorBlock(13, "visual", "deepening", ["c3"]),
    quizBlock(14, "c3"),
    validatorBlock(15, "visual", "transfer", CONCEPTS),
    validatorBlock(16, "text", "summary", CONCEPTS),
  ];
}

async function main() {
  assert(hasUsableKgConcepts(kg), "kg with concepts is usable");
  assert(!hasUsableKgConcepts(undefined), "missing kg is not usable");
  assert(
    !hasUsableKgConcepts({ ...kg, startTopic: { ...kg.startTopic, concepts: [] } }),
    "kg with no concepts is not usable",
  );

  const lesson = await generateLessonFromKg(kg, "L1", {
    plannerInvoke: async () => fixedIr,
    writerInvoke: async ({ batch }) => batch.jobs.map((j) => contentFor(j)),
  });
  assert(lesson.blocks.length === 16, "assembles 16 blocks");
  assert(lesson.title === "光合作用入门", "lesson title from plan");
  assert(lesson.estimatedMinutes === 45, "minutes from plan");
  assert(lesson.blocks.every((b) => b.id.startsWith("blk_L1_")), "stable namespaced block ids");
  assert(lesson.blocks.every((b) => (b.conceptIds?.length ?? 0) >= 1), "every block carries conceptIds");
  assert(lesson.blocks.filter((b) => b.type === "quiz").length === CONCEPTS.length, "one quiz block per concept");
  assert(validateLessonBlocks(lesson.blocks, CONCEPTS).ok, "assembled lesson passes validation");

  const again = await generateLessonFromKg(kg, "L1", {
    plannerInvoke: async () => fixedIr,
    writerInvoke: async ({ batch }) => batch.jobs.map((j) => contentFor(j)),
  });
  assert(
    again.blocks.map((b) => b.id).join(",") === lesson.blocks.map((b) => b.id).join(","),
    "regeneration reuses stable block ids",
  );

  const quizGap = lesson.blocks.map((b) => (b.type === "quiz" && b.conceptIds?.[0] === "c3" ? { ...b, conceptIds: ["c2"] } : b));
  const result = validateLessonBlocks(quizGap, CONCEPTS);
  assert(!result.ok && result.missing.some((m) => m.startsWith("quiz-missing:c3")), "validator flags missing concept quiz");

  assert(validateLessonBlocks(finalValidatorBaseBlocks(), CONCEPTS).ok, "final validator accepts the contract-shaped lesson");

  const lowMedia = finalValidatorBaseBlocks().map((block) =>
    block.id === "b4"
      ? validatorBlock(4, "text", "example", ["c1"])
      : block.id === "b5"
      ? validatorBlock(5, "text", "deepening", ["c1"])
      : block.id === "b9"
      ? validatorBlock(9, "text", "deepening", ["c2"])
      : block.id === "b13"
      ? validatorBlock(13, "text", "deepening", ["c3"])
      : block.type === "visual" && block.pedagogicalRole === "transfer"
      ? validatorBlock(15, "transfer", "transfer", CONCEPTS)
      : block,
  );
  const lowMediaResult = validateLessonBlocks(lowMedia, CONCEPTS);
  assert(!lowMediaResult.ok && lowMediaResult.missing.some((m) => m.startsWith("media-density:")), "final validator rejects low media density");

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
