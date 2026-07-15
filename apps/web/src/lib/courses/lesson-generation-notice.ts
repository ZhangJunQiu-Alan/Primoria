import type { LessonGenerationJobSummary } from "./lesson-generation-jobs";
import type { CourseSummary } from "./types";

export type LessonGenerationTarget = {
  number: number;
  title: string;
};

export function resolveLessonGenerationTarget(
  course: CourseSummary | null | undefined,
  job: LessonGenerationJobSummary,
): LessonGenerationTarget | null {
  if (!course) return null;
  const lessons = [...course.lessons].sort((a, b) => a.sortKey - b.sortKey);
  const index = lessons.findIndex((lesson) => lesson.id === job.lessonId);
  if (index < 0) return null;
  return { number: index + 1, title: lessons[index].title };
}
