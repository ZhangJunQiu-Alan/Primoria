import { describe, expect, it } from "vitest";

import { resolveLessonGenerationTarget } from "../src/lib/courses/lesson-generation-notice";
import type { LessonGenerationJobSummary } from "../src/lib/courses/lesson-generation-jobs";
import type { CourseSummary } from "../src/lib/courses/types";

describe("lesson generation notice target", () => {
  it("resolves the real lesson order and title instead of assuming the first lesson", () => {
    const lessons = [
      { id: "lesson-1", title: "Running Python Programs", sortKey: 1 },
      { id: "lesson-2", title: "Values, Variables, and Names", sortKey: 2 },
      { id: "lesson-3", title: "Working With Text", sortKey: 3 },
    ].map((lesson) => ({
      ...lesson,
      description: "",
      role: "new" as const,
      progress: "not_started" as const,
      status: "planned" as const,
      estimatedMinutes: null,
      updatedAt: 1,
    }));
    const course = { lessons } as CourseSummary;
    const job = { lessonId: "lesson-3" } as LessonGenerationJobSummary;

    expect(resolveLessonGenerationTarget(course, job)).toEqual({
      number: 3,
      title: "Working With Text",
    });
  });
});
