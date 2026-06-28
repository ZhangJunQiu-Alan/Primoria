#!/usr/bin/env tsx

import { compileBlockContent, blockIdFor } from "../src/lib/ai/course-generation/block-content-compiler.ts";
import { batchBlockJobs, buildBatchPrompt, writeLessonBlocks } from "../src/lib/ai/course-generation/block-writer.ts";
import { compileLessonPlanIr } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
import { BlockCompileError, WriterError } from "../src/lib/ai/course-generation/generation-errors.ts";
import type { BlockGenerationJob } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
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

const CONCEPTS = ["c1", "c2", "c3"];

function job(partial: Partial<BlockGenerationJob> & Pick<BlockGenerationJob, "order" | "type">): BlockGenerationJob {
  return {
    jobId: `b${partial.order}`,
    pedagogicalRole: "explanation",
    conceptIds: ["c1"],
    goal: "g",
    neighborGoals: {},
    ...partial,
  };
}

const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "biology",
  startTopic: {
    topicId: "t1",
    name: "Photosynthesis",
    concepts: CONCEPTS.map((conceptId, index) => ({
      conceptId,
      name: conceptId,
      defaultOrder: index + 1,
      ...(conceptId === "c2" ? { visual: "diagram" as const, visualHint: "flow of c2" } : {}),
    })),
  },
  targetConceptId: null,
  nextTopic: null,
};

function validIr() {
  return {
    v: 1,
    lesson: ["Lesson", 45],
    blocks: [
      [1, "T", "hook", ["c1"], "hook"],
      [2, "T", "roadmap", CONCEPTS, "roadmap"],
      [3, "T", "explanation", ["c1"], "explain c1"],
      [4, "I", "example", ["c1"], "image c1"],
      [5, "T", "example", ["c1"], "example c1"],
      [6, "V", "deepening", ["c1"], "visual c1"],
      [7, "Q", "assessment", ["c1"], "quiz c1"],
      [8, "T", "explanation", ["c2"], "explain c2"],
      [9, "I", "example", ["c2"], "image c2"],
      [10, "T", "example", ["c2"], "example c2"],
      [11, "V", "deepening", ["c2"], "visual c2"],
      [12, "Q", "assessment", ["c2"], "quiz c2"],
      [13, "T", "explanation", ["c3"], "explain c3"],
      [14, "I", "example", ["c3"], "image c3"],
      [15, "T", "example", ["c3"], "example c3"],
      [16, "V", "deepening", ["c3"], "visual c3"],
      [17, "Q", "assessment", ["c3"], "quiz c3"],
      [18, "V", "transfer", CONCEPTS, "transfer simulation"],
      [19, "T", "summary", CONCEPTS, "summary"],
    ],
  };
}

function contentFor(j: BlockGenerationJob): Record<string, unknown> {
  const order = j.order;
  switch (j.type) {
    case "text":
      return { order, title: `t${order}`, markdown: `body ${order}` };
    case "analogy":
      return { order, title: `a${order}`, source: "s", target: "t", mapping: "m" };
    case "transfer":
      return { order, title: `x${order}`, fromDomain: "f", toDomain: "to", explanation: "e", example: "ex" };
    case "code":
      return { order, title: `c${order}`, language: "python", code: "print(1)", explanation: "e" };
    case "image":
      return {
        order,
        title: `i${order}`,
        learningGoal: "recognize the structure",
        imageKind: "structure_diagram",
        prompt: "A clean educational illustration with no labels",
        alt: "A structure illustration",
        caption: "Notice the structure.",
      };
    case "visual":
      return { order, title: `v${order}`, description: "d", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
    case "quiz":
      return {
        order,
        title: `q${order}`,
        questions: j.conceptIds.map((conceptId, index) => ({
          kind: "single",
          id: `q${index + 1}`,
          question: `q${index + 1}?`,
          choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
          correctId: "a",
          conceptId,
        })),
      };
  }
}

async function main() {
  const textBlock = compileBlockContent(job({ order: 3, type: "text" }), contentFor(job({ order: 3, type: "text" })), "L1");
  assert(textBlock.id === "blk_L1_3", "stable namespaced id");
  assert(textBlock.conceptIds?.[0] === "c1", "conceptIds merged from job");
  assert(textBlock.pedagogicalRole === "explanation", "pedagogicalRole merged from job");

  const imageBlock = compileBlockContent(job({ order: 4, type: "image", pedagogicalRole: "example" }), contentFor(job({ order: 4, type: "image" })), "L1");
  assert(imageBlock.type === "image" && imageBlock.brief, "image compiles to pending image brief");

  const visualBlock = compileBlockContent(job({ order: 12, type: "visual" }), contentFor(job({ order: 12, type: "visual" })), "L1");
  assert(visualBlock.type === "visual", "visual compiles with mermaid payload");

  await assertRejects(
    async () => compileBlockContent(job({ order: 4, type: "code" }), { order: 4, title: "t", language: "py" }, "L1"),
    BlockCompileError,
    "code missing code/explanation rejected",
  );
  await assertRejects(
    async () => compileBlockContent(job({ order: 12, type: "visual" }), { order: 12, title: "v", description: "d", engine: "echarts" }, "L1"),
    BlockCompileError,
    "visual missing engine payload rejected",
  );

  const plan = compileLessonPlanIr(validIr(), kg);
  const batches = batchBlockJobs(plan.jobs);
  assert(batches.some((b) => b.kind === "activation" && b.jobs.length === 2), "activation batched together");
  assert(batches.filter((b) => b.kind === "transfer").length === 1, "transfer is its own task");
  assert(batches.filter((b) => b.kind === "quiz").length === CONCEPTS.length, "one quiz batch per concept");
  assert(batches.filter((b) => b.kind === "summary").length === 1, "summary is its own task");
  assert(batches.every((b) => b.jobs.length <= 3), "no batch exceeds 3 blocks");

  const quizBatch = batches.find((batch) => batch.kind === "quiz")!;
  const quizPrompt = buildBatchPrompt(quizBatch, plan, kg);
  assert(quizPrompt.system.includes("concept-closing quiz"), "quiz prompt identifies concept-closing quizzes");
  assert(quizPrompt.system.includes("Every question MUST include exactly one \"conceptId\""), "quiz prompt requires per-question concept attribution");
  assert(quizPrompt.user.includes("c1 [id=c1]") && !quizPrompt.user.includes("c2 [id=c2]"), "quiz prompt lists only that quiz concept id");

  const quizJob = quizBatch.jobs[0];
  await assertRejects(
    async () => compileBlockContent(quizJob, {
      order: quizJob.order,
      title: "quiz",
      questions: [{ kind: "truefalse", id: "q1", question: "q?", correct: true }],
    }, "L1"),
    BlockCompileError,
    "quiz question missing conceptId rejected",
  );
  await assertRejects(
    async () => compileBlockContent(quizJob, {
      order: quizJob.order,
      title: "quiz",
      questions: [{ kind: "truefalse", id: "q1", question: "q?", correct: true, conceptId: "invented-concept" }],
    }, "L1"),
    BlockCompileError,
    "quiz question with unknown conceptId rejected",
  );

  const blocks = await writeLessonBlocks({
    plan,
    lessonId: "L1",
    kg,
    invoke: async ({ batch }) => batch.jobs.map((j) => contentFor(j)),
  });
  assert(blocks.length === 19, "writes all 19 blocks");
  assert(blocks[0].id === "blk_L1_1", "blocks ordered by plan order");
  assert(blockIdFor(plan.jobs[16], "L1") === "blk_L1_17", "blockIdFor helper consistent");

  const stringOrderBlocks = await writeLessonBlocks({
    plan,
    lessonId: "L1",
    kg,
    invoke: async ({ batch }) => batch.jobs.map((j) => ({ ...contentFor(j), order: String(j.order) })),
  });
  assert(stringOrderBlocks.length === 19, "writer accepts pure numeric string order values");

  await assertRejects(
    async () =>
      writeLessonBlocks({
        plan,
        lessonId: "L1",
        kg,
        invoke: async ({ batch }) => {
          const contents = batch.jobs.map((j) => contentFor(j));
          return batch.kind === "activation" ? [...contents, { order: 999, title: "extra", markdown: "extra" }] : contents;
        },
      }),
    WriterError,
    "writer rejects orders outside the current batch",
  );

  await assertRejects(
    async () =>
      writeLessonBlocks({
        plan,
        lessonId: "L1",
        kg,
        invoke: async ({ batch }) => {
          const contents = batch.jobs.map((j) => contentFor(j));
          return batch.kind === "activation" ? contents.map((item) => ({ ...item, order: batch.jobs[0].order })) : contents;
        },
      }),
    WriterError,
    "writer rejects duplicate expected orders",
  );

  let calls = 0;
  const repaired = await writeLessonBlocks({
    plan,
    lessonId: "L1",
    kg,
    invoke: async ({ batch, repairHint }) => {
      if (batch.kind === "quiz" && !repairHint && batch.jobs[0].conceptIds[0] === "c1") {
        calls += 1;
        return [{ order: batch.jobs[0].order, title: "q" }];
      }
      return batch.jobs.map((j) => contentFor(j));
    },
  });
  assert(calls === 1, "first quiz attempt failed once");
  assert(repaired.length === 19, "repair recovered the quiz batch");

  await assertRejects(
    async () =>
      writeLessonBlocks({
        plan,
        lessonId: "L1",
        kg,
        invoke: async ({ batch }) => (batch.kind === "quiz" ? [{ order: batch.jobs[0].order, title: "q" }] : batch.jobs.map((j) => contentFor(j))),
      }),
    BlockCompileError,
    "persistent batch failure rejects the lesson",
  );

  await assertRejects(
    async () => writeLessonBlocks({ plan, lessonId: "L1", kg, invoke: async () => ({ nope: true }) }),
    WriterError,
    "non-array writer output rejected",
  );

  process.stdout.write("[block-content-compiler.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
