import { z } from "zod";
import { getCourse, updateLessonTitleAndDescriptionIfUnchanged } from "@/lib/courses/store";
import { invokeJson } from "./model-json";
import { fastTierSettings } from "../deepagent/model";

// Concept-frontier outlines name each lesson from a deterministic template (its
// concept names, e.g. "A 与 B"). After a NEW course outline is persisted, one
// best-effort background LLM call rewrites each lesson's title and one-line
// description. Every failure path keeps the template — the course is never
// blocked or degraded by this step. The LLM only renames; it never changes which
// concepts a lesson teaches (conceptIds are fixed at outline time).

const MAX_LESSONS = 40;
const MAX_TITLE_CHARS = 60;
const MAX_DESCRIPTION_CHARS = 160;
const ENRICHMENT_TIMEOUT_MS = 30_000;

const ResponseSchema = z.object({
  items: z.array(
    z.object({
      order: z.number().int().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
});

export function isOutlineEnrichmentDisabled() {
  return process.env.PRIMORIA_DISABLE_OUTLINE_ENRICHMENT === "1";
}

function clampText(value: string, max: number): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

function buildPrompts(input: {
  subject: string;
  language: string | null;
  lessons: { title: string; description: string }[];
}) {
  const languageLine = input.language?.toLowerCase().startsWith("zh")
    ? "Write every description in Chinese (中文)."
    : input.language
      ? `Write every description in the same language as the lesson titles (course language: ${input.language}).`
      : "Write every description in the same language as the lesson titles.";
  const system = `You name lessons in a course outline. Each lesson teaches a small set of concepts; the current title is a placeholder made of those concept names.

Rules:
- Return one item per lesson, keyed by the lesson's "order" number from the input.
- title: a natural lesson name of at most ${MAX_TITLE_CHARS} characters that covers the lesson's concepts. Do not invent concepts beyond the ones listed; do not just join them with "and".
- description: ONE sentence, at most ${MAX_DESCRIPTION_CHARS} characters, concrete about what the learner will understand or be able to do after the lesson. Do not repeat the title verbatim, no marketing language, no numbering.
- ${languageLine}

Return ONLY JSON: {"items":[{"order":1,"title":"...","description":"..."}]}.`;
  const user = `Course subject: ${input.subject}

Lessons (concepts to cover are shown as the current title):
${input.lessons.map((lesson, index) => `${index + 1}. concepts: ${lesson.title} — current description: ${lesson.description}`).join("\n")}`;
  return { system, user };
}

export async function enrichCourseOutlineDescriptions(input: {
  courseId: string;
  ownerId: string;
}): Promise<void> {
  if (isOutlineEnrichmentDisabled()) return;
  try {
    const course = await getCourse(input.courseId, input.ownerId);
    if (!course) return;
    const lessons = [...course.lessons].sort((a, b) => a.sortKey - b.sortKey).slice(0, MAX_LESSONS);
    if (lessons.length === 0) return;

    const { system, user } = buildPrompts({
      subject: course.topic,
      language: course.language ?? null,
      lessons: lessons.map((lesson) => ({ title: lesson.title, description: lesson.description })),
    });
    const raw = await invokeJson({
      system,
      user,
      // Best-effort cosmetic rewrite (template kept on any failure) — fast tier.
      settings: fastTierSettings(),
      schema: ResponseSchema,
      schemaName: "outline_descriptions",
      timeoutMs: ENRICHMENT_TIMEOUT_MS,
    });
    const parsed = ResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[course] outline enrichment returned an unusable shape", { courseId: input.courseId });
      return;
    }

    let updated = 0;
    for (const item of parsed.data.items) {
      const lesson = lessons[item.order - 1];
      if (!lesson) continue;
      const title = clampText(item.title, MAX_TITLE_CHARS) || lesson.title;
      const description = clampText(item.description, MAX_DESCRIPTION_CHARS) || lesson.description;
      if (title === lesson.title && description === lesson.description) continue;
      const applied = await updateLessonTitleAndDescriptionIfUnchanged({
        lessonId: lesson.id,
        courseId: input.courseId,
        ownerId: input.ownerId,
        expectedTitle: lesson.title,
        title,
        expectedDescription: lesson.description,
        description,
      });
      if (applied) updated += 1;
    }
    console.log("[course] outline enrichment applied", {
      courseId: input.courseId,
      updated,
      lessons: lessons.length,
    });
  } catch (error) {
    console.error("[course] outline enrichment failed", { courseId: input.courseId, error });
  }
}
