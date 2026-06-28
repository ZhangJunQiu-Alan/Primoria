import type { CourseBlock } from "@/lib/courses/types";
import { LessonValidationError } from "./generation-errors";
import { expectedBlockRange } from "./lesson-plan-ir";

// Final guard over the assembled blocks (doc §9.6). Even though the plan was
// compiled deterministically, the writer could drop coverage (e.g. a quiz with
// too few concepts). This re-checks the finished lesson against the concept set
// and reports the gaps so the orchestrator can target regeneration.

export type LessonValidationResult = { ok: true } | { ok: false; missing: string[] };

export function validateLessonBlocks(blocks: CourseBlock[], conceptIds: string[]): LessonValidationResult {
  const missing: string[] = [];
  const typeCount = (type: CourseBlock["type"]) => blocks.filter((b) => b.type === type).length;
  const visualCount = typeCount("visual");
  const imageCount = typeCount("image");
  const { min, max } = expectedBlockRange(conceptIds.length, visualCount + imageCount);
  if (blocks.length < min || blocks.length > max) missing.push(`count:${blocks.length}`);

  if (typeCount("transfer") !== 1) missing.push(`transfer:${typeCount("transfer")}`);
  if (typeCount("quiz") !== 1) missing.push(`quiz:${typeCount("quiz")}`);
  if (visualCount > conceptIds.length) missing.push(`visual:${visualCount}`);
  if (!blocks.some((b) => b.pedagogicalRole === "summary")) missing.push("summary:0");

  // Image blocks are anchors, not teaching coverage — they never satisfy a
  // concept's required explanation/example.
  const hasRole = (conceptId: string, role: string) =>
    blocks.some((b) => b.type !== "image" && b.pedagogicalRole === role && (b.conceptIds ?? []).includes(conceptId));
  for (const conceptId of conceptIds) {
    if (!hasRole(conceptId, "explanation")) missing.push(`explanation:${conceptId}`);
    if (!hasRole(conceptId, "example")) missing.push(`example:${conceptId}`);
  }

  const quiz = blocks.find((b) => b.type === "quiz");
  if (quiz) {
    const covered = new Set(quiz.conceptIds ?? []);
    for (const conceptId of conceptIds) {
      if (!covered.has(conceptId)) missing.push(`quiz-concept:${conceptId}`);
    }
  }

  // A pending image block (still carrying its brief) means the imaging stage did
  // not run — never publish it.
  for (const block of blocks) {
    if (block.type === "image" && block.brief) {
      missing.push(`pending-image:${block.id}`);
    }
  }

  const titles = blocks.map((b) => (b.title ?? "").trim().toLowerCase()).filter(Boolean);
  const dupes = titles.filter((title, i) => titles.indexOf(title) !== i);
  if (dupes.length > 0) missing.push(`duplicate-title:${[...new Set(dupes)].join("|")}`);

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/** Throw if the assembled lesson fails validation. */
export function assertLessonValid(blocks: CourseBlock[], conceptIds: string[]): void {
  const result = validateLessonBlocks(blocks, conceptIds);
  if (!result.ok) {
    throw new LessonValidationError(`assembled lesson failed validation: ${result.missing.join(", ")}`, result.missing);
  }
}
