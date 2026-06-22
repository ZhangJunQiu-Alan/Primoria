#!/usr/bin/env tsx

import { buildPlannerPrompt, planLesson } from "../src/lib/ai/course-generation/lesson-planner.ts";
import { compileLessonPlanIr } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
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
    concepts: CONCEPTS.map((conceptId, index) => ({ conceptId, name: `概念${index + 1}`, defaultOrder: index + 1 })),
  },
  targetConceptId: "c2",
  nextTopic: null,
};

// A fixed IR a well-behaved planner would emit for this 4-concept topic.
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
    [11, "A", "deepening", ["c2"], "analogy"],
    [12, "V", "deepening", ["c2"], "visual"],
    [13, "X", "transfer", CONCEPTS, "transfer"],
    [14, "Q", "assessment", CONCEPTS, "quiz"],
    [15, "T", "summary", CONCEPTS, "summary"],
  ],
};

async function main() {
  const prompt = buildPlannerPrompt(kg);
  assert(prompt.includes("15-16"), "prompt states the 4-concept block range");
  assert(prompt.includes("c2"), "prompt surfaces the target concept");
  assert(prompt.includes("T = text"), "prompt lists type codes");
  assert(prompt.includes("at most ONE V=visual") || prompt.includes("At most ONE V=visual"), "prompt caps visuals");

  // Planner output (mocked) flows through the deterministic compiler.
  const raw = await planLesson(kg, { invoke: async () => fixedIr });
  const compiled = compileLessonPlanIr(raw, kg);
  assert(compiled.jobs.length === 15, "mocked planner IR compiles to 15 jobs");
  assert(compiled.title === "导数入门", "lesson title decoded");

  process.stdout.write("[lesson-planner.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
