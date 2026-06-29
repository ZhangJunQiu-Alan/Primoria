import type { CourseContext } from "../deepagent/course-kg-context";
import type { ConceptVisual } from "../../knowledge-graph/topic-graph";
import { isCodeEligibleLessonContext } from "./code-eligibility";
import { CoverageError } from "./generation-errors";
import {
  decodeLessonPlanIr,
  expectedBlockRange,
  type DecodedBlockPlan,
  type GeneratableBlockType,
} from "./lesson-plan-ir";
import type { PedagogicalRole } from "@/lib/courses/types";

export { isCodeEligibleLessonContext };

// Deterministic LessonPlan compiler. Pure: no LLM, no DB, no guessing. It takes
// the planner's raw compact IR plus the KG context and either returns a fully
// validated plan with one generation job per block, or throws a classified
// CoverageError. It never invents teaching content or silently degrades.

/** Concrete rendering engines. The writer NEVER chooses this — it is pinned
 * deterministically from the KG `visual` affordance so the model cannot invent
 * an unknown engine. */
export type VisualEngine = "html" | "echarts" | "mermaid" | "physics" | "algorithm" | "math_explorer";

const AFFORDANCE_TO_ENGINE: Record<ConceptVisual, VisualEngine> = {
  interactive: "html",
  simulation: "physics",
  algorithm: "algorithm",
  function: "math_explorer",
  chart: "echarts",
  diagram: "mermaid",
};

/** Pin a visual block's engine from its primary concept's KG affordance; default
 * to `html` (the most flexible interactive engine) when no concept pins one. */
function resolveVisualEngine(kg: CourseContext, conceptIds: string[]): VisualEngine {
  for (const id of conceptIds) {
    const affordance = kg.startTopic.concepts?.find((c) => c.conceptId === id)?.visual;
    if (affordance) return AFFORDANCE_TO_ENGINE[affordance];
  }
  return "html";
}

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
  /** Deterministically pinned for `visual` blocks (from the KG affordance); the
   * writer emits only the payload, the compiler injects this engine. */
  engine?: VisualEngine;
};

export type CompiledLessonPlan = {
  irVersion: number;
  title: string;
  estimatedMinutes: number;
  /** KG concept ids in default order — the authoritative coverage target. */
  conceptIds: string[];
  jobs: BlockGenerationJob[];
};

export type CompileLessonPlanOptions = {
  /** Prior user/chat context; used only for code-block eligibility checks. */
  contextHint?: string | null;
};

const MIN_MINUTES = 3;
const MAX_MINUTES = 60;
const MIN_MEDIA_RATIO = 0.30;
const MAX_MEDIA_RATIO = 0.45;

function orderedConceptIds(kg: CourseContext): string[] {
  return [...(kg.startTopic.concepts ?? [])]
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((concept) => concept.conceptId);
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
}

export function compileLessonPlanIr(
  rawIr: unknown,
  kg: CourseContext,
  options: CompileLessonPlanOptions = {},
): CompiledLessonPlan {
  const decoded = decodeLessonPlanIr(rawIr);
  const concepts = orderedConceptIds(kg);
  const conceptSet = new Set(concepts);
  const blocks = decoded.blocks;

  validateQuantity(blocks, concepts.length);
  validateOrdering(blocks);
  validateConceptLegality(blocks, conceptSet);
  validateLessonComposition(blocks, concepts);
  validateMediaRules(blocks);
  validateImageRules(blocks);
  validateCodeEligibility(blocks, kg, options.contextHint);
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
    ...(block.type === "visual" ? { engine: resolveVisualEngine(kg, block.conceptIds) } : {}),
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

function validateLessonComposition(blocks: DecodedBlockPlan[], concepts: string[]): void {
  const typeCount = (type: GeneratableBlockType) => blocks.filter((b) => b.type === type).length;
  const roleCount = (role: PedagogicalRole) => blocks.filter((b) => b.role === role).length;
  const missing: string[] = [];
  if (roleCount("transfer") !== 1) missing.push(`transfer:${roleCount("transfer")}`);
  if (typeCount("quiz") !== concepts.length) missing.push(`quiz:${typeCount("quiz")}/${concepts.length}`);
  if (roleCount("summary") < 1) missing.push("summary:0");
  if (missing.length > 0) {
    throw new CoverageError(
      "lesson composition requires exactly one transfer, one quiz per concept, and a summary",
      missing,
    );
  }
}

function validateMediaRules(blocks: DecodedBlockPlan[]): void {
  const mediaBlocks = blocks.filter((b) => b.type === "image" || b.type === "visual");
  const ratio = blocks.length ? mediaBlocks.length / blocks.length : 0;
  const problems: string[] = [];

  if (ratio < MIN_MEDIA_RATIO || ratio > MAX_MEDIA_RATIO) {
    problems.push(`media-density:${mediaBlocks.length}/${blocks.length}`);
  }

  for (const block of mediaBlocks) {
    if (block.conceptIds.length === 0) problems.push(`media-no-concept:order${block.order}`);
    if (!block.goal.trim()) problems.push(`media-no-goal:order${block.order}`);
  }

  if (problems.length > 0) {
    throw new CoverageError(
      "lesson media blocks must be 30%-45% of the plan and carry concept-bound teaching goals",
      problems,
    );
  }
}

function validateCodeEligibility(blocks: DecodedBlockPlan[], kg: CourseContext, contextHint?: string | null): void {
  const codeBlocks = blocks.filter((b) => b.type === "code");
  if (codeBlocks.length === 0 || isCodeEligibleLessonContext(kg, contextHint)) return;
  throw new CoverageError(
    "code blocks are only allowed for programming, algorithm, software, numerical, ML, or explicit implementation goals",
    codeBlocks.map((block) => `code-uneligible:order${block.order}`),
  );
}

/** Image blocks are static anchors, not teaching coverage. They must bind to at
 * least one valid concept (legality checked separately) and play a supporting
 * role (example/deepening) — never assessment, and never decorative filler with
 * no concept. They do NOT need a KG visual affordance (unlike `visual`). */
function validateImageRules(blocks: DecodedBlockPlan[]): void {
  const allowedRoles = new Set<PedagogicalRole>(["example", "deepening"]);
  const problems: string[] = [];
  for (const block of blocks.filter((b) => b.type === "image")) {
    if (block.conceptIds.length === 0) problems.push(`image-no-concept:order${block.order}`);
    if (!allowedRoles.has(block.role)) problems.push(`image-bad-role:order${block.order}:${block.role}`);
  }
  if (problems.length > 0) {
    throw new CoverageError(
      "image blocks must bind to a concept and use the example or deepening role",
      problems,
    );
  }
}

function validateConceptCoverage(blocks: DecodedBlockPlan[], concepts: string[]): void {
  // Image blocks never satisfy explanation/example coverage — a real text/example
  // block is still required even when an image shares the concept and role.
  const hasRole = (conceptId: string, role: PedagogicalRole) =>
    blocks.some((b) => b.type !== "image" && b.role === role && b.conceptIds.includes(conceptId));
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
  const quizBlocks = blocks.filter((b) => b.type === "quiz");
  const transferOrder = Math.min(...blocks.filter((b) => b.role === "transfer").map((b) => b.order));
  const hits = new Map<string, DecodedBlockPlan[]>();
  const problems: string[] = [];

  for (const quiz of quizBlocks) {
    if (quiz.role !== "assessment") problems.push(`quiz-role:${quiz.order}:${quiz.role}`);
    if (quiz.conceptIds.length !== 1) {
      problems.push(`quiz-concept-shape:order${quiz.order}`);
      continue;
    }
    const conceptId = quiz.conceptIds[0];
    const list = hits.get(conceptId) ?? [];
    list.push(quiz);
    hits.set(conceptId, list);

    if (quiz.order > transferOrder) problems.push(`quiz-after-transfer:${conceptId}`);
    if (!blocks.some((b) => b.order < quiz.order && b.role === "explanation" && b.conceptIds.includes(conceptId))) {
      problems.push(`quiz-before-explanation:${conceptId}`);
    }
    if (!blocks.some((b) => b.order < quiz.order && b.type !== "image" && b.role === "example" && b.conceptIds.includes(conceptId))) {
      problems.push(`quiz-before-example:${conceptId}`);
    }
    if (
      blocks.some(
        (b) =>
          b.order > quiz.order
          && b.order < transferOrder
          && b.type !== "quiz"
          && b.type !== "transfer"
          && b.role !== "summary"
          && b.conceptIds.includes(conceptId),
      )
    ) {
      problems.push(`quiz-not-concept-close:${conceptId}`);
    }
  }

  for (const conceptId of concepts) {
    const count = hits.get(conceptId)?.length ?? 0;
    if (count === 0) problems.push(`quiz-missing:${conceptId}`);
    if (count > 1) problems.push(`quiz-duplicate:${conceptId}`);
  }

  if (problems.length > 0) {
    throw new CoverageError("each concept needs exactly one closing quiz block", problems);
  }
}
