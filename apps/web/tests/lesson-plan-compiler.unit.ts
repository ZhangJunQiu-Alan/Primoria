#!/usr/bin/env tsx

import { compileLessonPlanIr } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
import { IrParseError, CoverageError } from "../src/lib/ai/course-generation/generation-errors.ts";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function assertThrows(run: () => unknown, ErrorClass: new (...args: never[]) => Error, message: string) {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof ErrorClass, `${message} (got ${caught?.constructor?.name ?? "no throw"})`);
}

const CONCEPTS = ["c1", "c2", "c3", "c4"];

function kg(conceptIds: string[] = CONCEPTS): CourseContext {
  return {
    learningPathType: "linear",
    graphId: "g1",
    startTopic: {
      topicId: "t1",
      name: "Topic",
      concepts: conceptIds.map((conceptId, index) => ({ conceptId, name: conceptId, defaultOrder: index + 1 })),
    },
    targetConceptId: null,
    nextTopic: null,
  };
}

type Tuple = [number, string, string, string[], string];

// A valid 15-block plan for 4 concepts: 2 activation, explanation+example per
// concept, 2 deepening (one of them the single visual), transfer, quiz, summary.
function validBlocks(): Tuple[] {
  return [
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
    [11, "A", "deepening", ["c1"], "analogy deepen"],
    [12, "V", "deepening", ["c2"], "visual deepen"],
    [13, "X", "transfer", CONCEPTS, "transfer"],
    [14, "Q", "assessment", CONCEPTS, "quiz"],
    [15, "T", "summary", CONCEPTS, "summary"],
  ];
}

function ir(blocks: Tuple[], v = 1, minutes = 45) {
  return { v, lesson: ["Lesson", minutes], blocks };
}

function main() {
  // Happy path
  const compiled = compileLessonPlanIr(ir(validBlocks()), kg());
  assert(compiled.jobs.length === 15, "valid plan compiles to 15 jobs");
  assert(compiled.jobs[0].jobId === "b1", "stable jobId derived from order");
  assert(compiled.jobs[0].neighborGoals.next === "roadmap", "neighbor goals wired");
  assert(compiled.jobs[2].pedagogicalRole === "explanation", "role decoded");
  assert(compiled.jobs[3].type === "code", "type code C -> code");
  assert(compiled.estimatedMinutes === 45, "minutes pass through");
  assert(compileLessonPlanIr(ir(validBlocks(), 1, 9999), kg()).estimatedMinutes === 60, "minutes clamped to 60");

  // 16 blocks still valid for 4 concepts
  const sixteen = validBlocks();
  sixteen.splice(12, 0, [12.5, "T", "deepening", ["c3"], "extra deepen"]);
  sixteen.forEach((b, i) => (b[0] = i + 1));
  assert(compileLessonPlanIr(ir(sixteen), kg()).jobs.length === 16, "four concepts accept 16 blocks");

  // Version
  assertThrows(() => compileLessonPlanIr(ir(validBlocks(), 2), kg()), IrParseError, "unsupported IR version rejected");

  // Malformed shape
  assertThrows(() => compileLessonPlanIr({ v: 1, lesson: ["x"], blocks: [] }, kg()), IrParseError, "malformed IR rejected");

  // Unknown type code
  const badCode = validBlocks();
  badCode[3][1] = "Z";
  assertThrows(() => compileLessonPlanIr(ir(badCode), kg()), IrParseError, "unknown type code rejected");

  // Suspended type has no code (mind_map -> "M")
  const suspended = validBlocks();
  suspended[3][1] = "M";
  assertThrows(() => compileLessonPlanIr(ir(suspended), kg()), IrParseError, "suspended block type rejected");

  // Unknown role
  const badRole = validBlocks();
  badRole[3][2] = "frobnicate";
  assertThrows(() => compileLessonPlanIr(ir(badRole), kg()), IrParseError, "unknown role rejected");

  // Count too low (14)
  const fewer = validBlocks().filter((_, i) => i !== 10);
  assertThrows(() => compileLessonPlanIr(ir(fewer), kg()), CoverageError, "14 blocks rejected for 4 concepts");

  // Count too high (17)
  const more = validBlocks();
  more.splice(11, 0, [11.3, "T", "deepening", ["c1"], "d"], [11.6, "T", "deepening", ["c2"], "d"]);
  more.forEach((b, i) => (b[0] = i + 1));
  assertThrows(() => compileLessonPlanIr(ir(more), kg()), CoverageError, "17 blocks rejected for 4 concepts");

  // Order not strictly increasing
  const badOrder = validBlocks();
  badOrder[5][0] = 5;
  assertThrows(() => compileLessonPlanIr(ir(badOrder), kg()), CoverageError, "duplicate order rejected");

  // Illegal concept id
  const badConcept = validBlocks();
  badConcept[3][3] = ["c9"];
  assertThrows(() => compileLessonPlanIr(ir(badConcept), kg()), CoverageError, "illegal concept id rejected");

  // Concept missing explanation
  const noExplain = validBlocks();
  noExplain[2][2] = "deepening";
  assertThrows(() => compileLessonPlanIr(ir(noExplain), kg()), CoverageError, "missing explanation rejected");

  // Concept missing example
  const noExample = validBlocks();
  noExample[3][2] = "deepening";
  assertThrows(() => compileLessonPlanIr(ir(noExample), kg()), CoverageError, "missing example rejected");

  // Quiz omits a concept
  const quizGap = validBlocks();
  quizGap[13][3] = ["c1", "c2", "c3"];
  assertThrows(() => compileLessonPlanIr(ir(quizGap), kg()), CoverageError, "quiz omitting a concept rejected");

  // Missing transfer
  const noTransfer = validBlocks();
  noTransfer[12][1] = "T";
  assertThrows(() => compileLessonPlanIr(ir(noTransfer), kg()), CoverageError, "missing transfer rejected");

  // Two visuals
  const twoVisuals = validBlocks();
  twoVisuals[7][1] = "V";
  assertThrows(() => compileLessonPlanIr(ir(twoVisuals), kg()), CoverageError, "two visual blocks rejected");

  process.stdout.write("[lesson-plan-compiler.unit] ALL CHECKS PASSED\n");
}

main();
