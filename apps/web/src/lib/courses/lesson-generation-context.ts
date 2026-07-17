import type { Course, Lesson } from "./types";
import { getCourse } from "./store";
import { getTopicGraph, type TopicGraph, type TopicConcept } from "../knowledge-graph/topic-graph";
import { getGeneratedGraphById } from "../knowledge-graph/generated-graph";
import type { CourseContext, CourseContextTopic } from "../ai/deepagent/course-kg-context";
import { ContextError } from "../ai/course-generation/generation-errors";
import { getLearnerProfile } from "../learner-profile/store";
import { listActiveFacts } from "../learner-facts/store";
import { PLANNER_FACT_CATEGORIES, type FactCategory, type KnowledgeBackground, type LearnerFact } from "../learner-profile/types";
import { listConceptMasteryByOwner } from "../mastery/owner-store";
import type { MasteryStatus } from "../mastery/store";

const MAX_PLANNER_FACTS = 8;

// Pick the facts that personalize teaching (preference / prior_knowledge /
// learning_gap — never goal), ranked by confidence then recency, capped to bound
// the prompt. Returns the shape the CourseContext carries.
export function selectPlannerFacts(facts: LearnerFact[]): { text: string; category: FactCategory }[] {
  return facts
    .filter((f) => PLANNER_FACT_CATEGORIES.includes(f.category))
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0) || (Date.parse(b.lastSeenAt ?? "") || 0) - (Date.parse(a.lastSeenAt ?? "") || 0))
    .slice(0, MAX_PLANNER_FACTS)
    .map((f) => ({ text: f.text, category: f.category }));
}

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
  if (!graphId) return loadFreeformContext(ownerId, course, lesson);
  if (!topicId) {
    throw new ContextError(`lesson ${lessonId} has no knowledge-graph topic anchor (graphId=${graphId}, topicId=${topicId})`);
  }

  // Library graphs are static; gen_* graphs live in generated_topic_graphs.
  // Both share the TopicGraph shape, so the planner sees identical context.
  const graph = await resolveTopicGraph(graphId);
  if (!graph) throw new ContextError(`graph ${graphId} not found in library or generated graphs`);

  const orderedTopics = [...graph.topics].sort((a, b) => a.defaultOrder - b.defaultOrder);
  const topic = orderedTopics.find((entry) => entry.topicId === topicId);
  if (!topic) throw new ContextError(`topic ${topicId} not found in graph ${graphId}`);
  if ((topic.conceptIds?.length ?? 0) < 1) {
    throw new ContextError(`topic ${topicId} has no concepts to teach`);
  }

  // Mastery only adapts teaching depth — it must never block content generation.
  // On a DB error, degrade to an empty map (every concept reads as untested =
  // full teaching) rather than failing the lesson.
  let masteryByConcept = new Map<string, MasteryStatus>();
  let knowledgeBackground: KnowledgeBackground | null = null;
  let facts: { text: string; category: FactCategory }[] = [];
  try {
    const [masteryList, profile, activeFacts] = await Promise.all([
      listConceptMasteryByOwner(ownerId, graphId),
      getLearnerProfile(ownerId),
      listActiveFacts(ownerId),
    ]);
    masteryByConcept = new Map<string, MasteryStatus>(masteryList.map((m) => [m.conceptId, m.status]));
    knowledgeBackground = profile?.knowledgeBackground ?? null;
    facts = selectPlannerFacts(activeFacts);
  } catch (error) {
    console.warn(`[lesson-generation-context] profile/mastery/facts load failed for owner=${ownerId} graph=${graphId}; teaching all concepts as untested`, error);
  }

  // Concept-frontier lessons teach a concept subset (lesson.conceptIds); legacy /
  // freeform lessons carry none and fall back to the whole authored topic. The
  // "next" preview follows the next planned lesson, not the next authored topic.
  const conceptById = new Map<string, TopicConcept>();
  for (const t of graph.topics) for (const c of t.conceptIds) conceptById.set(c.conceptId, c);
  const resolveLessonConcepts = (conceptIds: string[] | undefined, fallbackTopicId: string | null | undefined): TopicConcept[] => {
    const resolved = (conceptIds ?? []).map((id) => conceptById.get(id)).filter((c): c is TopicConcept => Boolean(c));
    if (resolved.length > 0) return resolved;
    return graph.topics.find((t) => t.topicId === fallbackTopicId)?.conceptIds ?? [];
  };

  const orderedLessons = [...course.lessons].sort((a, b) => a.sortKey - b.sortKey);
  const nextLesson = orderedLessons.find((entry) => entry.sortKey > lesson.sortKey) ?? null;
  const currentConcepts = resolveLessonConcepts(lesson.conceptIds, topic.topicId);
  const nextConcepts = nextLesson ? resolveLessonConcepts(nextLesson.conceptIds, nextLesson.topicId) : [];

  const kg: CourseContext = {
    learningPathType: "linear",
    graphId,
    startTopic: toContextTopic(topic.topicId, lesson.title, withMastery(currentConcepts, masteryByConcept)),
    targetConceptId: null,
    nextTopic:
      nextLesson && nextConcepts.length > 0
        ? toContextTopic(nextLesson.topicId ?? topic.topicId, nextLesson.title, nextConcepts)
        : null,
    language: course.language ?? null,
    knowledgeBackground,
    facts,
    ...(graph.codeAdapted ? { codeEligible: true } : {}),
  };

  return { course, lesson, kg };
}

async function resolveTopicGraph(graphId: string): Promise<TopicGraph | null> {
  try {
    return getTopicGraph(graphId);
  } catch {
    return getGeneratedGraphById(graphId);
  }
}

// Free-form (out-of-library) course: no KG anchor exists, so the lesson itself
// is the teaching unit — a synthetic single-concept topic named by the lesson
// title, with the next planned lesson as the preview topic. Concept mastery is
// keyed by graph and does not apply here; profile/facts still personalize depth.
async function loadFreeformContext(
  ownerId: string,
  course: Course,
  lesson: Lesson,
): Promise<LessonGenerationContext> {
  const ordered = [...course.lessons].sort((a, b) => a.sortKey - b.sortKey);
  const index = ordered.findIndex((entry) => entry.id === lesson.id);
  const next = index >= 0 ? ordered[index + 1] ?? null : null;

  let knowledgeBackground: KnowledgeBackground | null = null;
  let facts: { text: string; category: FactCategory }[] = [];
  try {
    const [profile, activeFacts] = await Promise.all([getLearnerProfile(ownerId), listActiveFacts(ownerId)]);
    knowledgeBackground = profile?.knowledgeBackground ?? null;
    facts = selectPlannerFacts(activeFacts);
  } catch (error) {
    console.warn(`[lesson-generation-context] profile/facts load failed for owner=${ownerId} (freeform course ${course.id})`, error);
  }

  const freeformTopic = (entry: Lesson): CourseContextTopic => ({
    topicId: `freeform:${entry.id}`,
    name: entry.title,
    concepts: [{ conceptId: `freeform:${entry.id}:core`, name: entry.title, defaultOrder: 1 }],
  });

  const kg: CourseContext = {
    learningPathType: "linear",
    graphId: "",
    startTopic: freeformTopic(lesson),
    targetConceptId: null,
    nextTopic: next ? freeformTopic(next) : null,
    language: course.language ?? null,
    knowledgeBackground,
    facts,
  };

  return { course, lesson, kg };
}
