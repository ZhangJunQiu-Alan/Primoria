import type { CourseBlock } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import type { CourseContext } from "../deepagent/course-kg-context";
import { planLesson, type LessonPlannerInvoke } from "./lesson-planner";
import { compileLessonPlanIr } from "./lesson-plan-compiler";
import { writeLessonBlocks, type BlockBatchInvoke } from "./block-writer";
import { assertLessonValid } from "./lesson-validator";

// Lesson assembler: the end-to-end deterministic+LLM pipeline that turns a KG
// topic context into a validated set of CourseBlocks for one lesson.
//   plan (LLM) -> compile (pure) -> write blocks (LLM) -> compile (pure) -> validate (pure)
// It does not touch the database; the caller persists the result.

export type AssembledLesson = {
  title: string;
  estimatedMinutes: number;
  blocks: CourseBlock[];
};

export type GenerateLessonOptions = {
  contextHint?: string;
  settings?: TutorProviderSettings;
  // Injectable LLM calls for testing without a network.
  plannerInvoke?: LessonPlannerInvoke;
  writerInvoke?: BlockBatchInvoke;
};

/** True when the context has at least one KG concept, so the IR pipeline can run.
 * Free-form topics (no KG) fall back to the legacy generator. */
export function hasUsableKgConcepts(kg?: CourseContext): kg is CourseContext {
  return Boolean(kg && (kg.startTopic?.concepts?.length ?? 0) >= 1);
}

export async function generateLessonFromKg(
  kg: CourseContext,
  lessonId: string,
  options: GenerateLessonOptions = {},
): Promise<AssembledLesson> {
  const rawIr = await planLesson(kg, {
    contextHint: options.contextHint,
    settings: options.settings,
    invoke: options.plannerInvoke,
  });
  const plan = compileLessonPlanIr(rawIr, kg, { contextHint: options.contextHint });

  const blocks = await writeLessonBlocks({
    plan,
    lessonId,
    kg,
    settings: options.settings,
    invoke: options.writerInvoke,
  });

  assertLessonValid(blocks, plan.conceptIds);

  return { title: plan.title, estimatedMinutes: plan.estimatedMinutes, blocks };
}
