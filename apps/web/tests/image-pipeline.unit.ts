#!/usr/bin/env tsx

import { compileLessonPlanIr } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
import { CoverageError } from "../src/lib/ai/course-generation/generation-errors.ts";
import type { BlockGenerationJob } from "../src/lib/ai/course-generation/lesson-plan-compiler.ts";
import { compileBlockContent } from "../src/lib/ai/course-generation/block-content-compiler.ts";
import { finalizeImageBlocks, isPendingImageBlock } from "../src/lib/ai/media/image-builder.ts";
import { validateLessonBlocks } from "../src/lib/ai/course-generation/lesson-validator.ts";
import type { GeneratedImage, MediaAssetStore, NewMediaAsset } from "../src/lib/ai/media/media-assets.ts";
import type { MediaAssetRow } from "../src/lib/db/schema.ts";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context.ts";
import type { CourseBlock } from "../src/lib/courses/types.ts";

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

const CONCEPTS = ["c1", "c2"];

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

type Tuple = [number, string, string, string[], string, string];

const WI = "give the writer a concrete angle for this block";

function validBlocks(): Tuple[] {
  return [
    [1, "T", "hook", ["c1"], "hook", WI],
    [2, "T", "roadmap", CONCEPTS, "roadmap", WI],
    [3, "T", "explanation", ["c1"], "explain c1", WI],
    [4, "I", "example", ["c1"], "image c1", WI],
    [5, "T", "example", ["c1"], "example c1", WI],
    [6, "V", "deepening", ["c1"], "visual c1", WI],
    [7, "Q", "assessment", ["c1"], "quiz c1", WI],
    [8, "T", "explanation", ["c2"], "explain c2", WI],
    [9, "I", "example", ["c2"], "image c2", WI],
    [10, "T", "example", ["c2"], "example c2", WI],
    [11, "V", "deepening", ["c2"], "visual c2", WI],
    [12, "Q", "assessment", ["c2"], "quiz c2", WI],
    [13, "V", "transfer", CONCEPTS, "transfer simulation", WI],
    [14, "T", "summary", CONCEPTS, "summary", WI],
  ];
}

function ir(blocks: Tuple[], v = 2, minutes = 45) {
  return { v, lesson: ["Lesson", minutes], blocks };
}

function testCompilerImageRules() {
  // Image blocks (role example/deepening, bound to a concept) are accepted.
  const withImage = validBlocks();
  const compiled = compileLessonPlanIr(ir(withImage), kg());
  assert(compiled.jobs.length === 14, "image-bearing 2-concept plan accepted");
  assert(compiled.jobs.some((j) => j.type === "image" && j.conceptIds.includes("c1")), "image job compiled");

  // image does NOT need a KG visual affordance (kg() marks none) — accepted above.

  // image must bind to a concept.
  const noConcept = validBlocks();
  noConcept[3] = [4, "I", "deepening", [], "floating decoration", WI];
  assertThrows(() => compileLessonPlanIr(ir(noConcept), kg()), CoverageError, "image with no concept rejected");

  // image role must be example/deepening, never assessment.
  const badRole = validBlocks();
  badRole[3] = [4, "I", "assessment", ["c1"], "quiz-as-image", WI];
  assertThrows(() => compileLessonPlanIr(ir(badRole), kg()), CoverageError, "image with assessment role rejected");

  // image cannot stand in for a concept's required example (image excluded from coverage).
  const imageAsExample = validBlocks();
  imageAsExample[4] = [5, "I", "example", ["c1"], "picture instead of example", WI];
  assertThrows(() => compileLessonPlanIr(ir(imageAsExample), kg()), CoverageError, "image does not satisfy example coverage");
}

const IMAGE_JOB: BlockGenerationJob = {
  jobId: "b5",
  order: 5,
  type: "image",
  pedagogicalRole: "deepening",
  conceptIds: ["c1"],
  goal: "anchor the chloroplast",
  writerInstruction: "give the writer a concrete angle for this block",
  neighborGoals: {},
};

const IMAGE_CONTENT = {
  title: "Chloroplast",
  learningGoal: "Recognize the chloroplast structure",
  imageKind: "structure_diagram",
  prompt: "A flat illustration of a chloroplast cross-section",
  alt: "Chloroplast cross-section",
  caption: "Notice the stacked thylakoids.",
};

function testPendingCompile() {
  const block = compileBlockContent(IMAGE_JOB, IMAGE_CONTENT, "lesson1");
  assert(block.type === "image", "compiles to an image block");
  assert(isPendingImageBlock(block), "image compile yields a PENDING block (carries brief)");
  assert(block.type === "image" && block.assetId === "" && block.imageUrl === "", "pending block has no asset yet");
  assert(block.type === "image" && block.brief?.conceptIds.join() === "c1", "brief inherits the planner conceptIds");
  assert(block.id === "blk_lesson1_5", "stable block id");
}

function memoryStore(): MediaAssetStore & { calls: number } {
  const rows: NewMediaAsset[] = [];
  const toRow = (a: NewMediaAsset): MediaAssetRow => ({ ...a, brief: a.brief as unknown, createdAt: new Date(), updatedAt: new Date() }) as MediaAssetRow;
  return {
    calls: 0,
    async findByCacheKey(cacheKey) {
      const f = rows.find((r) => r.cacheKey === cacheKey);
      return f ? toRow(f) : null;
    },
    async getById(id) {
      const f = rows.find((r) => r.id === id);
      return f ? toRow(f) : null;
    },
    async insert(asset) {
      if (!rows.some((r) => r.cacheKey === asset.cacheKey)) rows.push(asset);
      return toRow(rows.find((r) => r.cacheKey === asset.cacheKey)!);
    },
  };
}

async function testFinalizeReadyAndReuse() {
  const pending = compileBlockContent(IMAGE_JOB, IMAGE_CONTENT, "lesson1");
  const store = memoryStore();
  let generateCalls = 0;
  const generate = async (): Promise<GeneratedImage> => {
    generateCalls += 1;
    return { mimeType: "image/jpeg", dataBase64: Buffer.from("img").toString("base64"), model: "gemini-3.1-flash-lite-image" };
  };

  const out1 = await finalizeImageBlocks([pending], { ownerId: "u1", model: "gemini-3.1-flash-lite-image", generate, store });
  const ready = out1[0];
  assert(ready.type === "image" && ready.status === "ready", "finalized block is ready");
  assert(ready.type === "image" && ready.imageUrl.startsWith("/api/media/assets/"), "ready block has an asset url");
  assert(ready.type === "image" && ready.brief === undefined, "finalized block strips the brief (never persisted)");
  assert(!isPendingImageBlock(ready), "finalized block is no longer pending");

  // Re-finalize an identical pending block: the cache serves it, no second generation.
  const pending2 = compileBlockContent(IMAGE_JOB, IMAGE_CONTENT, "lesson1");
  await finalizeImageBlocks([pending2], { ownerId: "u1", model: "gemini-3.1-flash-lite-image", generate, store });
  assert(generateCalls === 1, "identical brief reuses the cached asset (no second generation)");
}

async function testFinalizeErrorDoesNotThrow() {
  const pending = compileBlockContent(IMAGE_JOB, IMAGE_CONTENT, "lesson1");
  const store = memoryStore();
  const generate = async (): Promise<GeneratedImage> => {
    throw new Error("gemini quota exceeded");
  };
  const out = await finalizeImageBlocks([pending], { ownerId: "u1", model: "m", generate, store });
  const errored = out[0];
  assert(errored.type === "image" && errored.status === "error", "generation failure yields an error block, not a throw");
  assert(errored.type === "image" && errored.imageUrl === "" && errored.assetId === "", "error block has no asset");
  assert(errored.type === "image" && (errored.errorMessage ?? "").includes("quota"), "error message is surfaced");
  assert(errored.type === "image" && errored.brief === undefined, "error block also strips the brief");
}

async function testNonImagePassthrough() {
  const text: CourseBlock = { id: "t1", type: "text", markdown: "hi" };
  const out = await finalizeImageBlocks([text], { ownerId: "u1", model: "m", generate: async () => { throw new Error("should not be called"); } });
  assert(out[0] === text, "non-image blocks pass through untouched");
}

function testValidatorRejectsPending() {
  const pending = compileBlockContent(IMAGE_JOB, IMAGE_CONTENT, "lesson1");
  const result = validateLessonBlocks([pending], ["c1"]);
  assert(result.ok === false && result.missing.some((m) => m.startsWith("pending-image:")), "validator rejects an unfinalized pending image block");
}

async function main() {
  testCompilerImageRules();
  testPendingCompile();
  await testFinalizeReadyAndReuse();
  await testFinalizeErrorDoesNotThrow();
  await testNonImagePassthrough();
  testValidatorRejectsPending();
  process.stdout.write("[image-pipeline.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
