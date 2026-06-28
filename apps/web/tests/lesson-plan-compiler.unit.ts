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

const CONCEPTS = ["c1", "c2", "c3"];

function kg(conceptIds: string[] = CONCEPTS, visualIds: string[] = []): CourseContext {
  const visualSet = new Set(visualIds);
  return {
    learningPathType: "linear",
    graphId: "g1",
    startTopic: {
      topicId: "t1",
      name: "Topic",
      concepts: conceptIds.map((conceptId, index) => ({
        conceptId,
        name: conceptId,
        defaultOrder: index + 1,
        ...(visualSet.has(conceptId) ? { visual: "function" as const, visualHint: "plot it" } : {}),
      })),
    },
    targetConceptId: null,
    nextTopic: null,
  };
}

type Tuple = [number, string, string, string[], string];

// A valid 12-block plan for 3 concepts with NO visual-worthy concept: 2
// activation, explanation+example per concept, 1 analogy deepening, transfer,
// quiz, summary. (Visual coverage is exercised separately below.)
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
    [9, "A", "deepening", ["c1"], "analogy deepen"],
    [10, "X", "transfer", CONCEPTS, "transfer"],
    [11, "Q", "assessment", CONCEPTS, "quiz"],
    [12, "T", "summary", CONCEPTS, "summary"],
  ];
}

function validTwoConceptBlocks(): Tuple[] {
  return [
    [1, "T", "hook", ["c1"], "hook"],
    [2, "T", "roadmap", ["c1", "c2"], "roadmap"],
    [3, "T", "explanation", ["c1"], "explain c1"],
    [4, "C", "example", ["c1"], "example c1"],
    [5, "T", "explanation", ["c2"], "explain c2"],
    [6, "T", "example", ["c2"], "example c2"],
    [7, "X", "transfer", ["c1", "c2"], "transfer"],
    [8, "Q", "assessment", ["c1", "c2"], "quiz"],
    [9, "T", "summary", ["c1", "c2"], "summary"],
  ];
}

function ir(blocks: Tuple[], v = 1, minutes = 45) {
  return { v, lesson: ["Lesson", minutes], blocks };
}

function main() {
  // Happy path
  const compiled = compileLessonPlanIr(ir(validBlocks()), kg());
  assert(compiled.jobs.length === 12, "valid 3-concept plan compiles to 12 jobs");
  assert(compiled.jobs[0].jobId === "b1", "stable jobId derived from order");
  assert(compiled.jobs[0].neighborGoals.next === "roadmap", "neighbor goals wired");
  assert(compiled.jobs[2].pedagogicalRole === "explanation", "role decoded");
  assert(compiled.jobs[3].type === "code", "type code C -> code");
  assert(compiled.estimatedMinutes === 45, "minutes pass through");
  assert(compileLessonPlanIr(ir(validBlocks(), 1, 9999), kg()).estimatedMinutes === 60, "minutes clamped to 60");

  const twoConceptCompiled = compileLessonPlanIr(ir(validTwoConceptBlocks()), kg(["c1", "c2"]));
  assert(twoConceptCompiled.jobs.length === 9, "valid 2-concept plan compiles to 9 jobs");

  // 13 blocks still valid for 3 concepts
  const thirteen = validBlocks();
  thirteen.splice(9, 0, [9.5, "T", "deepening", ["c3"], "extra deepen"]);
  thirteen.forEach((b, i) => (b[0] = i + 1));
  assert(compileLessonPlanIr(ir(thirteen), kg()).jobs.length === 13, "three concepts accept 13 blocks");

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

  // Count too low (9)
  const fewer = validBlocks().filter((_, i) => ![8, 9, 10].includes(i));
  assertThrows(() => compileLessonPlanIr(ir(fewer), kg()), CoverageError, "9 blocks rejected for 3 concepts");

  // Count too high (14)
  const more = validBlocks();
  more.splice(9, 0, [9.3, "T", "deepening", ["c1"], "d"], [9.6, "T", "deepening", ["c2"], "d"]);
  more.forEach((b, i) => (b[0] = i + 1));
  assertThrows(() => compileLessonPlanIr(ir(more), kg()), CoverageError, "14 blocks rejected for 3 concepts");

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
  quizGap[10][3] = ["c1", "c2"];
  assertThrows(() => compileLessonPlanIr(ir(quizGap), kg()), CoverageError, "quiz omitting a concept rejected");

  // Missing transfer
  const noTransfer = validBlocks();
  noTransfer[9][1] = "T";
  assertThrows(() => compileLessonPlanIr(ir(noTransfer), kg()), CoverageError, "missing transfer rejected");

  // A stray visual on a concept the KG did not mark visual-worthy is rejected.
  const strayVisual = validBlocks();
  strayVisual[8][1] = "V"; // order 9, concept c1 — but base kg() has no visual concepts
  assertThrows(() => compileLessonPlanIr(ir(strayVisual), kg()), CoverageError, "unwarranted visual block rejected");

  // ── Per-concept visual coverage (KG marks c2 visual-worthy) ──────────────────
  const kgV = kg(CONCEPTS, ["c2"]);

  // 13-block plan that includes the mandated visual on c2 compiles.
  function validBlocksV(): Tuple[] {
    const blocks = validBlocks();
    blocks.splice(9, 0, [9.5, "V", "deepening", ["c2"], "visual deepen c2"]);
    blocks.forEach((b, i) => (b[0] = i + 1));
    return blocks;
  }
  const compiledV = compileLessonPlanIr(ir(validBlocksV()), kgV);
  assert(compiledV.jobs.length === 13, "visual-worthy topic accepts the mandated visual (13 blocks)");
  assert(compiledV.jobs.some((j) => j.type === "visual" && j.conceptIds.includes("c2")), "mandated visual present on c2");

  // Missing the mandated visual is rejected even though the block count is in range.
  assertThrows(() => compileLessonPlanIr(ir(validBlocks()), kgV), CoverageError, "missing mandated visual rejected");

  // A second visual on the same concept is rejected (exactly one).
  const dupVisual = validBlocksV();
  dupVisual[8][1] = "V"; // turn an analogy deepening (c1) ... point it at c2 too
  dupVisual[8][3] = ["c2"];
  assertThrows(() => compileLessonPlanIr(ir(dupVisual), kgV), CoverageError, "duplicate visual on a concept rejected");

  // A visual on a non-worthy concept (c3) alongside the required c2 visual is rejected.
  const wrongConcept = validBlocksV();
  wrongConcept[8][1] = "V";
  wrongConcept[8][3] = ["c3"];
  assertThrows(() => compileLessonPlanIr(ir(wrongConcept), kgV), CoverageError, "visual on non-worthy concept rejected");

  process.stdout.write("[lesson-plan-compiler.unit] ALL CHECKS PASSED\n");
}

main();
