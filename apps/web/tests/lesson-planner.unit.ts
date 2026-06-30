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

const wi = (s: string) => `${s} — keep this block distinct from its neighbors.`;
const fixedIr = {
  v: 2,
  lesson: ["光合作用入门", 45],
  blocks: [
    [1, "T", "hook", ["c1"], "hook", wi("open with a real case")],
    [2, "T", "roadmap", CONCEPTS, "roadmap", wi("map the three concepts in order")],
    [3, "T", "explanation", ["c1"], "explain c1", wi("introduce c1 from intuition first")],
    [4, "I", "example", ["c1"], "image c1", wi("anchor c1 with a concrete picture")],
    [5, "T", "example", ["c1"], "example c1", wi("show one worked example for c1")],
    [6, "V", "deepening", ["c1"], "visual c1", wi("let the learner drag a slider for c1")],
    [7, "Q", "assessment", ["c1"], "quiz c1", wi("check the c1 misconception")],
    [8, "T", "explanation", ["c2"], "explain c2", wi("introduce c2 building on c1")],
    [9, "I", "example", ["c2"], "image c2", wi("anchor c2 with a structure image")],
    [10, "T", "example", ["c2"], "example c2", wi("show one worked example for c2")],
    [11, "V", "deepening", ["c2"], "visual c2", wi("operate the c2 mechanism live")],
    [12, "Q", "assessment", ["c2"], "quiz c2", wi("check the c2 application")],
    [13, "T", "explanation", ["c3"], "explain c3", wi("introduce c3 from a question")],
    [14, "I", "example", ["c3"], "image c3", wi("contrast c3 in a static chart")],
    [15, "T", "example", ["c3"], "example c3", wi("show one worked example for c3")],
    [16, "V", "deepening", ["c3"], "visual c3", wi("simulate the c3 state space")],
    [17, "Q", "assessment", ["c3"], "quiz c3", wi("check the c3 transfer")],
    [18, "V", "transfer", CONCEPTS, "transfer simulation", wi("combine all three concepts interactively")],
    [19, "T", "summary", CONCEPTS, "summary", wi("metacognitive wrap-up, no new content")],
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
  assert(prompt.includes("Combined I+V count MUST be 30%-45%"), "prompt states media density target");
  assert(prompt.includes("EXACT TARGETS FOR THIS LESSON"), "prompt injects arithmetic targets");
  assert(prompt.includes("Produce EXACTLY 19 blocks"), "prompt states exact block count for 3 concepts");
  assert(prompt.includes("RECOMMENDED SKELETON"), "prompt includes a fillable skeleton");
  assert(prompt.includes("VISUAL AFFORDANCE HINTS"), "prompt lists visual affordance hints");
  assert(prompt.includes("engine diagram"), "prompt names the per-concept visual engine hint");
  assert(!prompt.includes("each REQUIRES one V=visual"), "prompt no longer treats visual hints as exact quotas");
  assert(!prompt.includes("Do NOT emit a V=visual block for any concept that is NOT listed"), "prompt allows planner-chosen visuals");
  assert(prompt.includes("WRITER INSTRUCTION"), "prompt has a writerInstruction section");
  assert(prompt.includes(`"writerInstruction"`), "prompt output format includes writerInstruction key");
  assert(prompt.includes("execution brief"), "prompt frames writerInstruction as the writer's execution brief");
  assert(prompt.includes("Do NOT restate the goal"), "prompt forbids repeating goal in writerInstruction");
  assert(prompt.includes("REQUIRED on every block"), "prompt requires writerInstruction on every block");

  // ── facts injection ────────────────────────────────────────────────────────
  assert(!prompt.includes("WHAT WE'VE LEARNED ABOUT THIS LEARNER"), "no facts header when kg has no facts");
  const promptWithFacts = buildPlannerPrompt({
    ...kg,
    facts: [
      { text: "Prefers worked examples before definitions", category: "preference" },
      { text: "Confuses limit value with function value", category: "learning_gap" },
    ],
  });
  assert(promptWithFacts.includes("WHAT WE'VE LEARNED ABOUT THIS LEARNER"), "facts header present when kg has facts");
  assert(promptWithFacts.includes("Prefers worked examples before definitions"), "preference fact rendered");
  assert(promptWithFacts.includes("Confuses limit value with function value"), "learning_gap fact rendered");
  assert(promptWithFacts.includes("<learner_facts>"), "facts injected inside a data block, not as bare instructions");
  assert(promptWithFacts.includes("writerInstruction"), "facts guidance points the planner at writerInstruction");

  const raw = await planLesson(kg, { invoke: async () => fixedIr });
  const compiled = compileLessonPlanIr(raw, kg);
  assert(compiled.jobs.length === 19, "mocked planner IR compiles to 19 jobs");
  assert(compiled.jobs.filter((job) => job.type === "quiz").length === CONCEPTS.length, "one quiz job per concept");
  assert(compiled.title === "光合作用入门", "lesson title decoded");
  assert(
    compiled.jobs.every((job) => typeof job.writerInstruction === "string" && job.writerInstruction.length >= 12),
    "every compiled job carries a writerInstruction",
  );
  assert(compiled.jobs[0].writerInstruction.includes("open with a real case"), "writerInstruction flows from IR to job");

  process.stdout.write("[lesson-planner.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
