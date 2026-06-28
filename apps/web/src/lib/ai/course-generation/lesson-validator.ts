import type { CourseBlock } from "@/lib/courses/types";
import { LessonValidationError } from "./generation-errors";
import { expectedBlockRange } from "./lesson-plan-ir";

// Final guard over the assembled blocks (doc §9.6). Even though the plan was
// compiled deterministically, the writer could drop coverage (e.g. a quiz with
// too few concepts). This re-checks the finished lesson against the concept set
// and reports the gaps so the orchestrator can target regeneration.

export type LessonValidationResult = { ok: true } | { ok: false; missing: string[] };

const MIN_MEDIA_RATIO = 0.15;
const MAX_MEDIA_RATIO = 0.60;

export function validateLessonBlocks(blocks: CourseBlock[], conceptIds: string[]): LessonValidationResult {
  const missing: string[] = [];
  const typeCount = (type: CourseBlock["type"]) => blocks.filter((b) => b.type === type).length;
  const visualCount = typeCount("visual");
  const imageCount = typeCount("image");
  const mediaCount = visualCount + imageCount;
  const { min, max } = expectedBlockRange(conceptIds.length);
  if (blocks.length < min || blocks.length > max) missing.push(`count:${blocks.length}`);

  const transferCount = blocks.filter((b) => b.pedagogicalRole === "transfer").length;
  if (transferCount !== 1) missing.push(`transfer:${transferCount}`);
  if (typeCount("quiz") !== conceptIds.length) missing.push(`quiz:${typeCount("quiz")}/${conceptIds.length}`);
  if (!blocks.some((b) => b.pedagogicalRole === "summary")) missing.push("summary:0");
  const mediaRatio = blocks.length ? mediaCount / blocks.length : 0;
  if (mediaRatio < MIN_MEDIA_RATIO || mediaRatio > MAX_MEDIA_RATIO) missing.push(`media-density:${mediaCount}/${blocks.length}`);

  for (const block of blocks) {
    if ((block.type === "image" || block.type === "visual") && (block.conceptIds ?? []).length === 0) {
      missing.push(`media-no-concept:${block.id}`);
    }
    if (block.type === "image" && block.pedagogicalRole !== "example" && block.pedagogicalRole !== "deepening") {
      missing.push(`image-role:${block.id}:${block.pedagogicalRole}`);
    }
  }

  // Image blocks are anchors, not teaching coverage — they never satisfy a
  // concept's required explanation/example.
  const hasRole = (conceptId: string, role: string) =>
    blocks.some((b) => b.type !== "image" && b.pedagogicalRole === role && (b.conceptIds ?? []).includes(conceptId));
  for (const conceptId of conceptIds) {
    if (!hasRole(conceptId, "explanation")) missing.push(`explanation:${conceptId}`);
    if (!hasRole(conceptId, "example")) missing.push(`example:${conceptId}`);
  }

  const quizBlocks = blocks.filter((b) => b.type === "quiz");
  const transferIndex = blocks.findIndex((b) => b.pedagogicalRole === "transfer");
  const quizHits = new Map<string, number>();
  for (const quiz of quizBlocks) {
    const ids = quiz.conceptIds ?? [];
    if (quiz.pedagogicalRole !== "assessment") missing.push(`quiz-role:${quiz.id}:${quiz.pedagogicalRole}`);
    if (ids.length !== 1) {
      missing.push(`quiz-concept-shape:${quiz.id}`);
      continue;
    }
    const conceptId = ids[0];
    quizHits.set(conceptId, (quizHits.get(conceptId) ?? 0) + 1);
    const quizIndex = blocks.indexOf(quiz);
    if (transferIndex >= 0 && quizIndex > transferIndex) missing.push(`quiz-after-transfer:${conceptId}`);
    if (!blocks.some((b, i) => i < quizIndex && b.pedagogicalRole === "explanation" && (b.conceptIds ?? []).includes(conceptId))) {
      missing.push(`quiz-before-explanation:${conceptId}`);
    }
    if (!blocks.some((b, i) => i < quizIndex && b.type !== "image" && b.pedagogicalRole === "example" && (b.conceptIds ?? []).includes(conceptId))) {
      missing.push(`quiz-before-example:${conceptId}`);
    }
    if (
      blocks.some(
        (b, i) =>
          i > quizIndex
          && (transferIndex < 0 || i < transferIndex)
          && b.type !== "quiz"
          && b.type !== "transfer"
          && b.pedagogicalRole !== "summary"
          && (b.conceptIds ?? []).includes(conceptId),
      )
    ) {
      missing.push(`quiz-not-concept-close:${conceptId}`);
    }
  }
  for (const conceptId of conceptIds) {
    const count = quizHits.get(conceptId) ?? 0;
    if (count === 0) missing.push(`quiz-missing:${conceptId}`);
    if (count > 1) missing.push(`quiz-duplicate:${conceptId}`);
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
