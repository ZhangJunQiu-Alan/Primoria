#!/usr/bin/env tsx

import { compileLessonPlanIr, isCodeEligibleLessonContext } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
import { CoverageError, IrParseError } from "../src/lib/ai/course-generation/generation-errors.ts";
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

type Tuple = [number, string, string, string[], string];

const C2 = ["c1", "c2"];
const C3 = ["c1", "c2", "c3"];

function kg(conceptIds: string[] = C3, overrides: Partial<CourseContext> = {}): CourseContext {
  return {
    learningPathType: "linear",
    graphId: "biology",
    startTopic: {
      topicId: "t1",
      name: "Photosynthesis",
      concepts: conceptIds.map((conceptId, index) => ({
        conceptId,
        name: `Concept ${index + 1}`,
        defaultOrder: index + 1,
        ...(conceptId === "c2" ? { visual: "diagram" as const, visualHint: "show the mechanism" } : {}),
      })),
    },
    targetConceptId: null,
    nextTopic: null,
    ...overrides,
  };
}

function ir(blocks: Tuple[], v = 1, minutes = 45) {
  return { v, lesson: ["Lesson", minutes], blocks };
}

function validTwoConceptBlocks(): Tuple[] {
  return [
    [1, "T", "hook", ["c1"], "hook"],
    [2, "T", "roadmap", C2, "roadmap"],
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
    [13, "V", "transfer", C2, "transfer simulation"],
    [14, "T", "summary", C2, "summary"],
  ];
}

function validThreeConceptBlocks(): Tuple[] {
  return [
    [1, "T", "hook", ["c1"], "hook"],
    [2, "T", "roadmap", C3, "roadmap"],
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
    [18, "V", "transfer", C3, "transfer simulation"],
    [19, "T", "summary", C3, "summary"],
  ];
}

function main() {
  const compiled = compileLessonPlanIr(ir(validThreeConceptBlocks()), kg());
  assert(compiled.jobs.length === 19, "valid 3-concept plan compiles to 19 jobs");
  assert(compiled.jobs[0].jobId === "b1", "stable jobId derived from order");
  assert(compiled.jobs[0].neighborGoals.next === "roadmap", "neighbor goals wired");
  assert(compiled.jobs[2].pedagogicalRole === "explanation", "role decoded");
  assert(compiled.jobs[3].type === "image", "type code I -> image");
  assert(compiled.jobs.filter((j) => j.type === "quiz").length === 3, "one quiz per concept");
  assert(compiled.jobs.some((j) => j.type === "visual" && j.pedagogicalRole === "transfer"), "visual transfer accepted");
  assert(compiled.estimatedMinutes === 45, "minutes pass through");
  assert(compileLessonPlanIr(ir(validThreeConceptBlocks(), 1, 9999), kg()).estimatedMinutes === 60, "minutes clamped to 60");

  const twoConceptCompiled = compileLessonPlanIr(ir(validTwoConceptBlocks()), kg(C2));
  assert(twoConceptCompiled.jobs.length === 14, "valid 2-concept plan compiles to 14 jobs");

  const minThree: Tuple[] = [
    [1, "T", "hook", ["c1"], "hook"],
    [2, "T", "roadmap", C3, "roadmap"],
    [3, "T", "explanation", ["c1"], "explain c1"],
    [4, "V", "example", ["c1"], "visual example c1"],
    [5, "I", "deepening", ["c1"], "image c1"],
    [6, "Q", "assessment", ["c1"], "quiz c1"],
    [7, "T", "explanation", ["c2"], "explain c2"],
    [8, "T", "example", ["c2"], "example c2"],
    [9, "V", "deepening", ["c2"], "visual c2"],
    [10, "Q", "assessment", ["c2"], "quiz c2"],
    [11, "T", "explanation", ["c3"], "explain c3"],
    [12, "V", "example", ["c3"], "visual example c3"],
    [13, "I", "deepening", ["c3"], "image c3"],
    [14, "Q", "assessment", ["c3"], "quiz c3"],
    [15, "V", "transfer", C3, "transfer simulation"],
    [16, "T", "summary", C3, "summary"],
  ];
  assert(compileLessonPlanIr(ir(minThree), kg()).jobs.length === 16, "3-concept minimum 16 blocks accepted");

  assertThrows(() => compileLessonPlanIr(ir(validThreeConceptBlocks(), 2), kg()), IrParseError, "unsupported IR version rejected");
  assertThrows(() => compileLessonPlanIr({ v: 1, lesson: ["x"], blocks: [] }, kg()), IrParseError, "malformed IR rejected");

  const badCode = validThreeConceptBlocks();
  badCode[4][1] = "Z";
  assertThrows(() => compileLessonPlanIr(ir(badCode), kg()), IrParseError, "unknown type code rejected");

  const badRole = validThreeConceptBlocks();
  badRole[4][2] = "frobnicate";
  assertThrows(() => compileLessonPlanIr(ir(badRole), kg()), IrParseError, "unknown role rejected");

  const tooFew = validThreeConceptBlocks().slice(0, 15);
  assertThrows(() => compileLessonPlanIr(ir(tooFew), kg()), CoverageError, "15 blocks rejected for 3 concepts");

  const tooMany = validThreeConceptBlocks();
  tooMany.splice(17, 0, [17.2, "T", "deepening", ["c1"], "extra 1"], [17.4, "T", "deepening", ["c2"], "extra 2"]);
  tooMany.forEach((block, index) => (block[0] = index + 1));
  assertThrows(() => compileLessonPlanIr(ir(tooMany), kg()), CoverageError, "21 blocks rejected for 3 concepts");

  const badOrder = validThreeConceptBlocks();
  badOrder[5][0] = 5;
  assertThrows(() => compileLessonPlanIr(ir(badOrder), kg()), CoverageError, "duplicate order rejected");

  const badConcept = validThreeConceptBlocks();
  badConcept[4][3] = ["c9"];
  assertThrows(() => compileLessonPlanIr(ir(badConcept), kg()), CoverageError, "illegal concept id rejected");

  const noExplain = validThreeConceptBlocks();
  noExplain[2][2] = "deepening";
  assertThrows(() => compileLessonPlanIr(ir(noExplain), kg()), CoverageError, "missing explanation rejected");

  const noExample = validThreeConceptBlocks();
  noExample[4][2] = "deepening";
  assertThrows(() => compileLessonPlanIr(ir(noExample), kg()), CoverageError, "missing example rejected");

  const oneWholeLessonQuiz = validThreeConceptBlocks().filter((block) => block[1] !== "Q");
  oneWholeLessonQuiz.splice(16, 0, [16.5, "Q", "assessment", C3, "whole lesson quiz"]);
  oneWholeLessonQuiz.forEach((block, index) => (block[0] = index + 1));
  assertThrows(() => compileLessonPlanIr(ir(oneWholeLessonQuiz), kg()), CoverageError, "single combined quiz rejected");

  const quizTooEarly = validTwoConceptBlocks();
  quizTooEarly[6][0] = 4.5;
  quizTooEarly.sort((a, b) => a[0] - b[0]).forEach((block, index) => (block[0] = index + 1));
  assertThrows(() => compileLessonPlanIr(ir(quizTooEarly), kg(C2)), CoverageError, "quiz before concept loop close rejected");

  const imageAsExplanation = validTwoConceptBlocks();
  imageAsExplanation[3][2] = "explanation";
  assertThrows(() => compileLessonPlanIr(ir(imageAsExplanation), kg(C2)), CoverageError, "image as explanation rejected");

  const lowMedia = validTwoConceptBlocks();
  lowMedia[3][1] = "T";
  lowMedia[5][1] = "A";
  lowMedia[8][1] = "T";
  lowMedia[10][1] = "A";
  lowMedia[12][1] = "X";
  assertThrows(() => compileLessonPlanIr(ir(lowMedia), kg(C2)), CoverageError, "media density below 15 percent rejected");

  const highMedia = validTwoConceptBlocks();
  highMedia[0][1] = "V";
  highMedia[2][1] = "V";
  highMedia[4][1] = "V";
  highMedia[7][1] = "V";
  highMedia[9][1] = "V";
  assertThrows(() => compileLessonPlanIr(ir(highMedia), kg(C2)), CoverageError, "media density above 60 percent rejected");

  const nonCode = validTwoConceptBlocks();
  nonCode[4][1] = "C";
  assertThrows(() => compileLessonPlanIr(ir(nonCode), kg(C2)), CoverageError, "code block rejected for non-code topic");

  const socialKg = kg(C2, {
    graphId: "psychology",
    startTopic: {
      topicId: "self_actualization",
      name: "自我价值与目标设定",
      concepts: [
        { conceptId: "c1", name: "自我实现", defaultOrder: 1 },
        { conceptId: "c2", name: "目标内化", defaultOrder: 2 },
      ],
    },
  });
  assert(!isCodeEligibleLessonContext(socialKg, "如何实现自我价值"), "bare 实现 in self-actualization is not code intent");
  assert(!isCodeEligibleLessonContext(socialKg, "实现共同富裕的社会机制"), "bare 实现 in social-science context is not code intent");

  const selfActualizationCode = validTwoConceptBlocks();
  selfActualizationCode[4][1] = "C";
  assertThrows(
    () => compileLessonPlanIr(ir(selfActualizationCode), socialKg, { contextHint: "如何实现自我价值" }),
    CoverageError,
    "self-actualization context still rejects code block",
  );

  const codeEligible = validTwoConceptBlocks();
  codeEligible[4][1] = "C";
  const codeKg = kg(C2, { graphId: "data_structures_and_algorithms", startTopic: { ...kg(C2).startTopic, name: "Binary Search" } });
  assert(compileLessonPlanIr(ir(codeEligible), codeKg).jobs.some((job) => job.type === "code"), "code topic accepts code block");

  const userAskedForCode = validTwoConceptBlocks();
  userAskedForCode[4][1] = "C";
  assert(
    compileLessonPlanIr(ir(userAskedForCode), kg(C2), { contextHint: "我要用 Python 实现二分查找" }).jobs.some((job) => job.type === "code"),
    "explicit user programming-language goal accepts code block",
  );

  const userAskedForAlgorithmImplementation = validTwoConceptBlocks();
  userAskedForAlgorithmImplementation[4][1] = "C";
  assert(
    compileLessonPlanIr(ir(userAskedForAlgorithmImplementation), kg(C2), { contextHint: "我要实现算法和函数" }).jobs.some((job) => job.type === "code"),
    "explicit algorithm/function implementation goal accepts code block",
  );

  const extraVisualOnKgHint = validThreeConceptBlocks();
  extraVisualOnKgHint[9][1] = "V";
  assert(
    compileLessonPlanIr(ir(extraVisualOnKgHint), kg()).jobs.filter((job) => job.type === "visual").length === 5,
    "planner may use multiple visuals when media density stays valid",
  );

  process.stdout.write("[lesson-plan-compiler.unit] ALL CHECKS PASSED\n");
}

main();
