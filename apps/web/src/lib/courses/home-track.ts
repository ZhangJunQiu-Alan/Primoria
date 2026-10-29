import type { CourseSummary } from "./types";

/** At most this many lessons show on the home lesson track. */
export const HOME_TRACK_WINDOW = 6;

export type HomeLessonStop = {
  id: string;
  title: string;
  state: "done" | "now" | "todo";
};

export type HomeFeaturedCourse = {
  id: string;
  title: string;
  completed: number;
  total: number;
  /** 1-based number of the lesson to resume, or null for an empty course. */
  currentNumber: number | null;
  currentStarted: boolean;
  /** 1-based number of the first stop shown; > 1 when earlier lessons are cut. */
  windowStart: number;
  stops: HomeLessonStop[];
};

/**
 * The home "continue" card: the course's lessons in order, windowed around
 * the lesson to resume so long courses keep two finished lessons in view.
 */
export function buildHomeFeaturedCourse(course: CourseSummary, windowSize = HOME_TRACK_WINDOW): HomeFeaturedCourse {
  const lessons = course.lessons;
  const currentIndex = course.currentLesson ? lessons.findIndex((lesson) => lesson.id === course.currentLesson?.id) : -1;
  const anchor = currentIndex >= 0 ? currentIndex : Math.max(0, lessons.length - 1);
  const start = Math.max(0, Math.min(anchor - 2, lessons.length - windowSize));
  return {
    id: course.id,
    title: course.title,
    completed: course.completedLessonCount,
    total: lessons.length,
    currentNumber: currentIndex >= 0 ? currentIndex + 1 : null,
    currentStarted: currentIndex >= 0 && lessons[currentIndex].progress === "in_progress",
    windowStart: start + 1,
    stops: lessons.slice(start, start + windowSize).map((lesson, offset) => ({
      id: lesson.id,
      title: lesson.title,
      state: lesson.progress === "completed" ? "done" : start + offset === currentIndex ? "now" : "todo",
    })),
  };
}
