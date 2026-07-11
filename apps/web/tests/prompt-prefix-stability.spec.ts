import { describe, expect, it } from "vitest";

import { buildPlannerPrompt } from "../src/lib/ai/course-generation/lesson-planner";
import { buildBatchPrompt, type BlockBatch } from "../src/lib/ai/course-generation/block-writer";
import type { BlockGenerationJob, CompiledLessonPlan } from "../src/lib/ai/course-generation/lesson-plan-compiler";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";

// Prompt-cache prefix stability: providers (DeepSeek/OpenAI/Anthropic) cache by
// exact token prefix, so everything per-lesson must live AFTER the shared static
// instruction head. These tests pin that layout so a prompt edit cannot silently
// move dynamic content back to the front and kill the cache.

const PLANNER_CONTEXT_MARKER = "LESSON CONTEXT — the lesson to plan now:";
const WRITER_CONTEXT_MARKER = "LESSON CONTEXT:";

function kgFor(topic: string, language?: string): CourseContext {
  return {
    learningPathType: "linear",
    graphId: "g1",
    startTopic: {
      topicId: `t-${topic}`,
      name: topic,
      concepts: [
        { conceptId: `${topic}-c1`, name: `${topic} basics`, defaultOrder: 1, visual: "diagram", visualHint: "Diagram it." },
        { conceptId: `${topic}-c2`, name: `${topic} advanced`, defaultOrder: 2 },
      ],
    },
    targetConceptId: `${topic}-c1`,
    nextTopic: null,
    language,
  };
}

function job(order: number, type: BlockGenerationJob["type"], role: BlockGenerationJob["pedagogicalRole"], conceptId: string): BlockGenerationJob {
  return {
    jobId: `j${order}`,
    order,
    type,
    pedagogicalRole: role,
    conceptIds: [conceptId],
    goal: `goal ${order}`,
    writerInstruction: `write block ${order} with a concrete angle`,
    neighborGoals: {},
  };
}

function planFor(title: string, conceptId: string): CompiledLessonPlan {
  return {
    irVersion: 2,
    title,
    estimatedMinutes: 30,
    conceptIds: [conceptId],
    jobs: [job(1, "text", "hook", conceptId), job(2, "quiz", "assessment", conceptId)],
  };
}

function staticHead(prompt: string, marker: string): string {
  const index = prompt.indexOf(marker);
  expect(index).toBeGreaterThan(0);
  return prompt.slice(0, index);
}

describe("planner prompt cache prefix", () => {
  it("keeps the instruction head byte-identical across lessons and languages", () => {
    const a = buildPlannerPrompt(kgFor("Photosynthesis"));
    const b = buildPlannerPrompt(kgFor("Recursion", "zh"));
    const head = staticHead(a, PLANNER_CONTEXT_MARKER);
    expect(head.length).toBeGreaterThan(2000);
    expect(b.startsWith(head)).toBe(true);
  });

  it("keeps all per-lesson content in the LESSON CONTEXT tail", () => {
    const kg = kgFor("Photosynthesis", "zh");
    const prompt = buildPlannerPrompt(kg);
    const head = staticHead(prompt, PLANNER_CONTEXT_MARKER);
    const tail = prompt.slice(head.length);
    for (const dynamic of ["Photosynthesis", "t-Photosynthesis", "简体中文", "TARGET CONCEPT"]) {
      expect(head).not.toContain(dynamic);
      expect(tail).toContain(dynamic);
    }
  });
});

describe("writer batch prompt cache prefix", () => {
  it("shares one identical system across non-quiz batch kinds of a lesson", () => {
    const kg = kgFor("Photosynthesis");
    const plan = planFor("Lesson A", "Photosynthesis-c1");
    const activation: BlockBatch = { kind: "activation", jobs: [plan.jobs[0]] };
    const concept: BlockBatch = { kind: "concept", jobs: [plan.jobs[0]] };
    expect(buildBatchPrompt(activation, plan, kg).system).toBe(buildBatchPrompt(concept, plan, kg).system);
  });

  it("appends the quiz contract strictly after the shared system", () => {
    const kg = kgFor("Photosynthesis");
    const plan = planFor("Lesson A", "Photosynthesis-c1");
    const base = buildBatchPrompt({ kind: "concept", jobs: [plan.jobs[0]] }, plan, kg).system;
    const quiz = buildBatchPrompt({ kind: "quiz", jobs: [plan.jobs[1]] }, plan, kg).system;
    expect(quiz.startsWith(base)).toBe(true);
    expect(quiz.slice(base.length)).toContain("QUIZ");
  });

  it("keeps the writer contract byte-identical across lessons", () => {
    const a = buildBatchPrompt(
      { kind: "concept", jobs: [job(1, "text", "explanation", "x-c1")] },
      planFor("Lesson A", "x-c1"),
      kgFor("Photosynthesis"),
    ).system;
    const b = buildBatchPrompt(
      { kind: "concept", jobs: [job(1, "text", "explanation", "y-c1")] },
      planFor("Lesson B", "y-c1"),
      kgFor("Recursion", "zh"),
    ).system;
    const head = staticHead(a, WRITER_CONTEXT_MARKER);
    expect(head.length).toBeGreaterThan(400);
    expect(b.startsWith(head)).toBe(true);
    expect(head).not.toContain("Lesson A");
  });
});
