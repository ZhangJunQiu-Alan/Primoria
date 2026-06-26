import type { Course, Lesson } from "./types";
import { getCourse } from "./store";
import { getTopic, nextTopic } from "../knowledge-graph/topic-graph";
import type { CourseContext, CourseContextTopic } from "../ai/deepagent/course-kg-context";
import { ContextError } from "../ai/course-generation/generation-errors";
import { listConceptMasteryByOwner } from "../mastery/owner-store";
import type { MasteryStatus } from "../mastery/store";

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

// Merge per-concept mastery (absent = first-time learning) onto the topic the
// lesson actually teaches. Only the start topic needs it; the next topic is
// preview-only and never taught here.
function withMastery(concepts: CourseContextTopic["concepts"], mastery: Map<string, MasteryStatus>): CourseContextTopic["concepts"] {
  if (mastery.size === 0) return concepts;
  return concepts.map((c) => {
    const status = mastery.get(c.conceptId);
    return status ? { ...c, mastery: status } : c;
  });
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

  // Mastery only adapts teaching depth — it must never block content generation.
  // On a DB error, degrade to an empty map (every concept reads as untested =
  // full teaching) rather than failing the lesson.
  let masteryByConcept = new Map<string, MasteryStatus>();
  try {
    const masteryList = await listConceptMasteryByOwner(ownerId, graphId);
    masteryByConcept = new Map<string, MasteryStatus>(masteryList.map((m) => [m.conceptId, m.status]));
  } catch (error) {
    console.warn(`[lesson-generation-context] mastery load failed for owner=${ownerId} graph=${graphId}; teaching all concepts as untested`, error);
  }

  const next = nextTopic(graphId, topicId);
  const kg: CourseContext = {
    learningPathType: "linear",
    graphId,
    startTopic: toContextTopic(topic.topicId, topic.name, withMastery(topic.conceptIds, masteryByConcept)),
    targetConceptId: null,
    nextTopic: next ? toContextTopic(next.topicId, next.name, next.conceptIds) : null,
    language: course.language ?? null,
  };

  return { course, lesson, kg };
}
