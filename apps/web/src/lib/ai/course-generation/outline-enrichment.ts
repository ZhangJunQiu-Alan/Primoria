import { z } from "zod";
import { getCourse, updateLessonDescriptionIfUnchanged } from "@/lib/courses/store";
import { invokeJson } from "./model-json";
import { fastTierSettings } from "../deepagent/model";

// QA issue 9: planned-lesson descriptions are deterministic templates
// (plannedLessonDescription). After a NEW course outline is persisted, one
// best-effort background LLM call rewrites them. Every failure path keeps the
// template — the course is never blocked or degraded by this step.

const MAX_LESSONS = 40;
const MAX_DESCRIPTION_CHARS = 160;
const ENRICHMENT_TIMEOUT_MS = 30_000;

const ResponseSchema = z.object({
  items: z.array(
    z.object({
      order: z.number().int().min(1),
      description: z.string().min(1),
    }),
  ),
});

export function isOutlineEnrichmentDisabled() {
  return process.env.PRIMORIA_DISABLE_OUTLINE_ENRICHMENT === "1";
}

function normalizeDescription(value: string): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > MAX_DESCRIPTION_CHARS ? `${collapsed.slice(0, MAX_DESCRIPTION_CHARS - 1)}…` : collapsed;
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
  const system = `You improve the one-line descriptions of lessons in a course outline.

Rules:
- Return one item per lesson, keyed by the lesson's "order" number from the input.
- Each description is ONE sentence, at most ${MAX_DESCRIPTION_CHARS} characters, concrete about what the learner will understand or be able to do after the lesson.
- Do not repeat the lesson title verbatim, do not use marketing language, do not number the sentences.
- ${languageLine}

Return ONLY JSON: {"items":[{"order":1,"description":"..."}]}.`;
  const user = `Course subject: ${input.subject}

Lessons:
${input.lessons.map((lesson, index) => `${index + 1}. ${lesson.title} — current: ${lesson.description}`).join("\n")}`;
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
      const description = normalizeDescription(item.description);
      if (!description || description === lesson.description) continue;
      const applied = await updateLessonDescriptionIfUnchanged({
        lessonId: lesson.id,
        courseId: input.courseId,
        ownerId: input.ownerId,
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
