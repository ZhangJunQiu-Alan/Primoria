import { describe, expect, it } from "vitest";

import { buildHomeFeaturedCourse } from "../src/lib/courses/home-track";
import type { CourseSummary, CourseSummaryLesson, LessonProgress } from "../src/lib/courses/types";

function lesson(index: number, progress: LessonProgress): CourseSummaryLesson {
  return {
    id: `l${index}`,
    title: `Lesson ${index}`,
    description: "",
    role: "core",
    progress,
    status: "generated",
    sortKey: index,
    estimatedMinutes: null,
    updatedAt: 0,
  } as CourseSummaryLesson;
}

function course(progress: LessonProgress[]): CourseSummary {
  const lessons = progress.map((value, index) => lesson(index + 1, value));
  const currentLesson =
    lessons.find((item) => item.progress === "in_progress")
    ?? lessons.find((item) => item.progress !== "completed")
    ?? lessons[lessons.length - 1]
    ?? null;
  return {
    id: "c1",
    title: "Photosynthesis",
    lessons,
    lessonCount: lessons.length,
    completedLessonCount: lessons.filter((item) => item.progress === "completed").length,
    currentLesson,
  } as CourseSummary;
}

describe("buildHomeFeaturedCourse", () => {
  it("shows a short course whole and marks the lesson to resume", () => {
    const featured = buildHomeFeaturedCourse(course(["completed", "completed", "in_progress", "not_started"]));
    expect(featured.windowStart).toBe(1);
    expect(featured.stops.map((stop) => stop.state)).toEqual(["done", "done", "now", "todo"]);
    expect(featured.currentNumber).toBe(3);
    expect(featured.currentStarted).toBe(true);
  });

  it("windows a long course around the current lesson with two finished lessons before it", () => {
    const progress: LessonProgress[] = Array.from({ length: 12 }, (_, index) => (index < 6 ? "completed" : "not_started"));
    const featured = buildHomeFeaturedCourse(course(progress));
    expect(featured.windowStart).toBe(5);
    expect(featured.stops).toHaveLength(6);
    expect(featured.stops[2]).toMatchObject({ id: "l7", state: "now" });
    expect(featured.currentStarted).toBe(false);
  });

  it("keeps a full window at the end of a course", () => {
    const progress: LessonProgress[] = Array.from({ length: 10 }, (_, index) => (index < 9 ? "completed" : "in_progress"));
    const featured = buildHomeFeaturedCourse(course(progress));
    expect(featured.windowStart).toBe(5);
    expect(featured.stops.at(-1)).toMatchObject({ id: "l10", state: "now" });
  });
});
