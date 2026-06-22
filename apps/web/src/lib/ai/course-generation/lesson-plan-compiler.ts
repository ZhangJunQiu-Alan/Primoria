import type { CourseContext } from "../deepagent/course-kg-context";
import { CoverageError } from "./generation-errors";
import {
  decodeLessonPlanIr,
  expectedBlockRange,
  type DecodedBlockPlan,
  type GeneratableBlockType,
} from "./lesson-plan-ir";
import type { PedagogicalRole } from "@/lib/courses/types";

// Deterministic LessonPlan compiler. Pure: no LLM, no DB, no guessing. It takes
// the planner's raw compact IR plus the KG context and either returns a fully
// validated plan with one generation job per block, or throws a classified
// CoverageError. It never invents teaching content or silently degrades.

export type BlockGenerationJob = {
  /** Stable across retries so regeneration cannot duplicate a block (doc §11.3). */
  jobId: string;
  order: number;
  type: GeneratableBlockType;
  pedagogicalRole: PedagogicalRole;
  conceptIds: string[];
  goal: string;
  /** Adjacent block goals, so the writer can avoid overlap (doc §10.2). */
  neighborGoals: { prev?: string; next?: string };
};

export type CompiledLessonPlan = {
  irVersion: number;
  title: string;
  estimatedMinutes: number;
  /** KG concept ids in default order — the authoritative coverage target. */
  conceptIds: string[];
  jobs: BlockGenerationJob[];
};

const MIN_MINUTES = 3;
const MAX_MINUTES = 60;

function orderedConceptIds(kg: CourseContext): string[] {
  return [...(kg.startTopic.concepts ?? [])]
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((concept) => concept.conceptId);
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
}

export function compileLessonPlanIr(rawIr: unknown, kg: CourseContext): CompiledLessonPlan {
  const decoded = decodeLessonPlanIr(rawIr);
  const concepts = orderedConceptIds(kg);
  const conceptSet = new Set(concepts);
  const blocks = decoded.blocks;

  validateQuantity(blocks, concepts.length);
  validateOrdering(blocks);
  validateConceptLegality(blocks, conceptSet);
  validateLessonComposition(blocks);
  validateConceptCoverage(blocks, concepts);
  validateQuizCoverage(blocks, concepts);

  const jobs: BlockGenerationJob[] = blocks.map((block, index) => ({
    jobId: `b${block.order}`,
    order: block.order,
    type: block.type,
    pedagogicalRole: block.role,
    conceptIds: block.conceptIds,
    goal: block.goal,
    neighborGoals: {
      prev: blocks[index - 1]?.goal,
      next: blocks[index + 1]?.goal,
    },
  }));

  return {
    irVersion: decoded.irVersion,
    title: decoded.title,
    estimatedMinutes: clampMinutes(decoded.estimatedMinutes),
    conceptIds: concepts,
    jobs,
  };
}

function validateQuantity(blocks: DecodedBlockPlan[], conceptCount: number): void {
  const { min, max } = expectedBlockRange(conceptCount);
  if (blocks.length < min || blocks.length > max) {
    throw new CoverageError(
      `block count ${blocks.length} outside expected range ${min}-${max} for ${conceptCount} concepts`,
      [`count:${blocks.length}`],
    );
  }
}

function validateOrdering(blocks: DecodedBlockPlan[]): void {
  for (let i = 1; i < blocks.length; i += 1) {
    if (blocks[i].order <= blocks[i - 1].order) {
      throw new CoverageError("block orders must be unique and strictly increasing", [
        `order:${blocks[i - 1].order}->${blocks[i].order}`,
      ]);
    }
  }
}

function validateConceptLegality(blocks: DecodedBlockPlan[], conceptSet: Set<string>): void {
  const illegal = new Set<string>();
  for (const block of blocks) {
    for (const conceptId of block.conceptIds) {
      if (!conceptSet.has(conceptId)) illegal.add(conceptId);
    }
  }
  if (illegal.size > 0) {
    throw new CoverageError("plan references concept ids outside the current topic", [...illegal].map((id) => `concept:${id}`));
  }
}

function validateLessonComposition(blocks: DecodedBlockPlan[]): void {
  const typeCount = (type: GeneratableBlockType) => blocks.filter((b) => b.type === type).length;
  const roleCount = (role: PedagogicalRole) => blocks.filter((b) => b.role === role).length;
  const missing: string[] = [];
  if (typeCount("transfer") !== 1) missing.push(`transfer:${typeCount("transfer")}`);
  if (typeCount("quiz") !== 1) missing.push(`quiz:${typeCount("quiz")}`);
  if (typeCount("visual") > 1) missing.push(`visual:${typeCount("visual")}`);
  if (roleCount("summary") < 1) missing.push("summary:0");
  if (missing.length > 0) {
    throw new CoverageError(
      "lesson composition requires exactly one transfer, one quiz, at most one visual, and a summary",
      missing,
    );
  }
}

function validateConceptCoverage(blocks: DecodedBlockPlan[], concepts: string[]): void {
  const hasRole = (conceptId: string, role: PedagogicalRole) =>
    blocks.some((b) => b.role === role && b.conceptIds.includes(conceptId));
  const missing: string[] = [];
  for (const conceptId of concepts) {
    if (!hasRole(conceptId, "explanation")) missing.push(`explanation:${conceptId}`);
    if (!hasRole(conceptId, "example")) missing.push(`example:${conceptId}`);
  }
  if (missing.length > 0) {
    throw new CoverageError("each concept needs an explanation and an example/application block", missing);
  }
}

function validateQuizCoverage(blocks: DecodedBlockPlan[], concepts: string[]): void {
  const quiz = blocks.find((b) => b.type === "quiz");
  if (!quiz) return; // composition check already guarantees exactly one
  const covered = new Set(quiz.conceptIds);
  const missing = concepts.filter((conceptId) => !covered.has(conceptId)).map((id) => `quiz-concept:${id}`);
  if (missing.length > 0) {
    throw new CoverageError("the quiz block must reference every concept in the topic", missing);
  }
}
