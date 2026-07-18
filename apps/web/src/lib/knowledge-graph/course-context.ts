import { getTopic, getTopicGraph, nextTopic, type TopicConcept } from "./topic-graph";
import { type KgLanguage, localizeConcepts, resolveKgDisplayName } from "./display-name";

export type CourseContextTopic = {
  topicId: string;
  name: string;
  concepts: TopicConcept[];
};

export type CourseContext = {
  learningPathType: "linear";
  graphId: string;
  startTopic: CourseContextTopic;
  targetConceptId: string | null;
  targetConceptIds: string[];
  scope: "canonical" | "goal";
  learningGoal: string | null;
  nextTopic: CourseContextTopic | null;
};

export class InvalidCourseTopicAnchorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCourseTopicAnchorError";
  }
}

export function resolveCourseContextFromTopicAnchor(input: {
  graphId: string;
  startTopicId: string;
  targetConceptId?: string | null;
  targetConceptIds?: string[];
  scope?: "canonical" | "goal";
  learningGoal?: string | null;
  language?: KgLanguage;
}): CourseContext {
  let start;
  try {
    start = getTopic(input.graphId, input.startTopicId);
  } catch {
    throw new InvalidCourseTopicAnchorError(`Unknown knowledge graph: ${input.graphId}`);
  }
  if (!start) {
    throw new InvalidCourseTopicAnchorError(
      `Topic ${input.startTopicId} does not belong to graph ${input.graphId}`,
    );
  }

  const requestedTargets = input.targetConceptIds?.length
    ? input.targetConceptIds
    : input.targetConceptId
      ? [input.targetConceptId]
      : [];
  const targetConceptIds = [...new Set(requestedTargets)];
  if (
    !input.targetConceptIds?.length &&
    input.targetConceptId &&
    !start.conceptIds.some((concept) => concept.conceptId === input.targetConceptId)
  ) {
    throw new InvalidCourseTopicAnchorError(
      `Concept ${input.targetConceptId} does not belong to topic ${input.startTopicId}`,
    );
  }
  const graphConceptIds = new Set(
    getTopicGraph(input.graphId).topics.flatMap((topic) => topic.conceptIds.map((concept) => concept.conceptId)),
  );
  const invalidTarget = targetConceptIds.find((conceptId) => !graphConceptIds.has(conceptId));
  if (invalidTarget) {
    throw new InvalidCourseTopicAnchorError(
      `Concept ${invalidTarget} does not belong to graph ${input.graphId}`,
    );
  }
  const targetConceptId = targetConceptIds[0] ?? null;

  const next = nextTopic(input.graphId, input.startTopicId);
  const language = input.language;
  return {
    learningPathType: "linear",
    graphId: input.graphId,
    startTopic: {
      topicId: start.topicId,
      name: resolveKgDisplayName(start, language),
      concepts: localizeConcepts(start.conceptIds, language),
    },
    targetConceptId,
    targetConceptIds,
    scope: input.scope ?? (targetConceptIds.length > 1 || input.learningGoal ? "goal" : "canonical"),
    learningGoal: input.learningGoal?.trim() || null,
    nextTopic: next
      ? {
          topicId: next.topicId,
          name: resolveKgDisplayName(next, language),
          concepts: localizeConcepts(next.conceptIds, language),
        }
      : null,
  };
}
