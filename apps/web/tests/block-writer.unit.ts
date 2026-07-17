#!/usr/bin/env tsx

import { buildBatchPrompt, type BlockBatch } from "../src/lib/ai/course-generation/block-writer.ts";
import type { BlockGenerationJob, CompiledLessonPlan } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "biology",
  language: "zh",
  knowledgeBackground: "high_school",
  startTopic: {
    topicId: "t1",
    name: "Entropy",
    concepts: [
      { conceptId: "entropy", name: "Entropy", defaultOrder: 1, assessmentHint: "compute the entropy of a small distribution" },
      { conceptId: "info", name: "Information", defaultOrder: 2 },
    ],
  },
  targetConceptId: "entropy",
  nextTopic: null,
} as CourseContext;

function job(overrides: Partial<BlockGenerationJob>): BlockGenerationJob {
  return {
    jobId: "b3",
    order: 3,
    type: "text",
    pedagogicalRole: "explanation",
    conceptIds: ["entropy"],
    goal: "explain entropy as uncertainty reduction",
    writerInstruction: "Start with a guessing-game intuition, then introduce the formula only after the learner understands why uncertainty matters.",
    neighborGoals: { prev: "roadmap", next: "example entropy" },
    ...overrides,
  };
}

const plan: CompiledLessonPlan = {
  irVersion: 2,
  title: "Entropy 入门",
  estimatedMinutes: 30,
  conceptIds: ["entropy", "info"],
  jobs: [],
};

function main() {
  const batch: BlockBatch = { kind: "concept", jobs: [job({})] };
  const { system, user } = buildBatchPrompt(batch, plan, kg);

  // The writerInstruction is handed to the writer verbatim.
  assert(user.includes("Writer instruction:"), "user prompt labels the writer instruction");
  assert(
    user.includes("Start with a guessing-game intuition"),
    "user prompt carries the planner's writerInstruction text",
  );

  // The writer executes, it does not re-plan the lesson.
  assert(system.includes("only EXECUTE"), "system prompt tells the writer to execute, not plan");
  assert(system.includes("Do NOT re-plan"), "system prompt forbids re-planning");
  assert(!/re-?plan the lesson yourself/i.test(user), "user prompt does not ask the writer to plan");

  // Existing directives are preserved.
  assert(/language/i.test(system), "system prompt keeps the language directive");
  assert(system.includes("LEARNER BACKGROUND"), "system prompt keeps the knowledge-background directive");
  assert(system.includes("single dollar delimiters ($...$)"), "system prompt requires remark-math inline delimiters");
  assert(system.includes("Never use \\(...\\) or \\[...\\]"), "system prompt rejects unsupported LaTeX bracket delimiters");
  assert(user.includes("Fields:"), "user prompt keeps the per-block field hints");

  // A quiz batch keeps its contract and still surfaces the instruction.
  const quizBatch: BlockBatch = {
    kind: "quiz",
    jobs: [job({ jobId: "b7", order: 7, type: "quiz", pedagogicalRole: "assessment", writerInstruction: "Probe the common misconception that entropy means disorder; one single-answer question." })],
  };
  const quiz = buildBatchPrompt(quizBatch, plan, kg);
  assert(quiz.user.includes("Writer instruction:"), "quiz prompt carries the writer instruction");
  assert(quiz.system.includes("QUIZ:"), "quiz prompt keeps the quiz contract");
  // KG assessment hint surfaces on quiz blocks only.
  assert(
    quiz.user.includes("Check specifically: compute the entropy of a small distribution"),
    "quiz prompt injects the concept's KG assessment hint",
  );
  assert(!/Check specifically:/.test(user), "non-quiz block does not inject the assessment hint");

  process.stdout.write("[block-writer.unit] ALL CHECKS PASSED\n");
}

main();
