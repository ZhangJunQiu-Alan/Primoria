import type { Course, Lesson } from "./types";
import { getCourse } from "./store";
import { getTopic, nextTopic } from "../knowledge-graph/topic-graph";
import type { CourseContext, CourseContextTopic } from "../ai/deepagent/course-kg-context";
import { ContextError } from "../ai/course-generation/generation-errors";

// Immutable generation context loaded by the worker from explicit ownerId (doc
// §9.1). Never uses request/session auth. A missing course/lesson/graph/topic is
// a non-retryable ContextError.

export type LessonGenerationContext = {
  course: Course;
  lesson: Lesson;
  kg: CourseContext;
};

function toContextTopic(topicId: string, name: string, concepts: CourseContextTopic["concepts"]): CourseContextTopic {
  return { topicId, name, concepts };
}

export async function loadLessonGenerationContext(input: {
  ownerId: string;
  courseId: string;
  lessonId: string;
}): Promise<LessonGenerationContext> {
  const { ownerId, courseId, lessonId } = input;
  const course = await getCourse(courseId, ownerId);
  if (!course) throw new ContextError(`course ${courseId} not found for owner`);

  const lesson = course.lessons.find((entry) => entry.id === lessonId);
  if (!lesson) throw new ContextError(`lesson ${lessonId} not found in course ${courseId}`);

  const graphId = course.graphId;
  const topicId = lesson.topicId;
  if (!graphId || !topicId) {
    throw new ContextError(`lesson ${lessonId} has no knowledge-graph topic anchor (graphId=${graphId}, topicId=${topicId})`);
  }

  const topic = getTopic(graphId, topicId);
  if (!topic) throw new ContextError(`topic ${topicId} not found in graph ${graphId}`);
  if ((topic.conceptIds?.length ?? 0) < 1) {
    throw new ContextError(`topic ${topicId} has no concepts to teach`);
  }

  const next = nextTopic(graphId, topicId);
  const kg: CourseContext = {
    learningPathType: "linear",
    graphId,
    startTopic: toContextTopic(topic.topicId, topic.name, topic.conceptIds),
    targetConceptId: null,
    nextTopic: next ? toContextTopic(next.topicId, next.name, next.conceptIds) : null,
  };

  return { course, lesson, kg };
}
