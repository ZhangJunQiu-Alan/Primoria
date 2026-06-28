#!/usr/bin/env tsx

import { compileLessonPlanIr } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
import { buildPlannerPrompt, planLesson } from "../src/lib/ai/course-generation/lesson-planner.ts";
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
      ...(conceptId === "c2" ? { visual: "diagram" as const, visualHint: "show energy flow" } : {}),
    })),
  },
  targetConceptId: "c2",
  nextTopic: null,
};

const fixedIr = {
  v: 1,
  lesson: ["光合作用入门", 45],
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

async function main() {
  const prompt = buildPlannerPrompt(kg);
  assert(prompt.includes("16-20"), "prompt states the 3-concept block range");
  assert(prompt.includes("CODE ELIGIBILITY"), "prompt includes code eligibility rules");
  assert(prompt.includes("C=code is opt-in"), "prompt says code is opt-in");
  assert(prompt.includes("generic \"implementation\" / \"实现\" language"), "prompt does not treat bare implementation language as code intent");
  assert(prompt.includes("exactly one Q=quiz") || prompt.includes("exactly one Q=quiz block"), "prompt requires per-concept quiz");
  assert(prompt.includes("conceptIds MUST be exactly [that one concept]"), "prompt forbids whole-lesson quiz conceptIds");
  assert(prompt.includes("Combined I+V count should generally target 30%-45%"), "prompt states media density target");
  assert(prompt.includes("VISUAL AFFORDANCE HINTS"), "prompt lists visual affordance hints");
  assert(prompt.includes("engine diagram"), "prompt names the per-concept visual engine hint");
  assert(!prompt.includes("each REQUIRES one V=visual"), "prompt no longer treats visual hints as exact quotas");
  assert(!prompt.includes("Do NOT emit a V=visual block for any concept that is NOT listed"), "prompt allows planner-chosen visuals");

  const raw = await planLesson(kg, { invoke: async () => fixedIr });
  const compiled = compileLessonPlanIr(raw, kg);
  assert(compiled.jobs.length === 19, "mocked planner IR compiles to 19 jobs");
  assert(compiled.jobs.filter((job) => job.type === "quiz").length === CONCEPTS.length, "one quiz job per concept");
  assert(compiled.title === "光合作用入门", "lesson title decoded");

  process.stdout.write("[lesson-planner.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
