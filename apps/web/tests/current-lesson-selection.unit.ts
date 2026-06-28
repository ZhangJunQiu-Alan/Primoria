#!/usr/bin/env tsx

import { currentCourseLesson, currentLessonBlocks, type Course, type Lesson, type TextBlock } from "../src/lib/courses/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function block(id: string): TextBlock {
  return { id, type: "text", title: id, markdown: id };
}

function lesson(input: Partial<Lesson> & Pick<Lesson, "id" | "sortKey">): Lesson {
  return {
    title: input.id,
    role: "new",
    progress: "not_started",
    status: "generated",
    topicId: input.id,
    triggeredFrom: null,
    blocks: [block(`block_${input.id}`)],
    estimatedMinutes: 10,
    version: 1,
    createdAt: 1,
    updatedAt: 1,
    ...input,
  };
}

function course(lessons: Lesson[]): Course {
  return {
    id: "course_1",
    title: "Course",
    topic: "Topic",
    summary: "Summary",
    estimatedMinutes: 30,
    graphId: "graph",
    lessons,
    version: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}

function main() {
  const withPreloadedNext = course([
    lesson({ id: "lesson_1", sortKey: 1, progress: "in_progress", blocks: [block("current_only")] }),
    lesson({ id: "lesson_2", sortKey: 2, progress: "not_started", blocks: [block("preloaded_next")] }),
  ]);

  assert(currentCourseLesson(withPreloadedNext)?.id === "lesson_1", "default current lesson stays on the in-progress lesson");
  assert(currentLessonBlocks(withPreloadedNext).map((entry) => entry.id).join(",") === "current_only", "preloaded next blocks are not visible on the current lesson");
  assert(currentLessonBlocks(withPreloadedNext, "lesson_2").map((entry) => entry.id).join(",") === "preloaded_next", "explicit lesson jump shows only the requested generated lesson");

  const nextStillGenerating = course([
    lesson({ id: "lesson_1", sortKey: 1, progress: "completed", blocks: [block("completed_old")] }),
    lesson({ id: "lesson_2", sortKey: 2, progress: "not_started", status: "generating", blocks: null }),
  ]);

  assert(currentCourseLesson(nextStillGenerating) === null, "completed old lessons are not shown while the next lesson is still generating");
  assert(currentLessonBlocks(nextStillGenerating).length === 0, "no stale completed blocks leak into the lesson page while the next lesson is generating");

  process.stdout.write("[current-lesson-selection.unit] ALL CHECKS PASSED\n");
}

main();
