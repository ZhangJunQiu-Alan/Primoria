import { getTopic, nextTopic, type TopicConcept } from "./topic-graph";
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

  const targetConceptId = input.targetConceptId ?? null;
  if (targetConceptId && !start.conceptIds.some((concept) => concept.conceptId === targetConceptId)) {
    throw new InvalidCourseTopicAnchorError(
      `Concept ${targetConceptId} does not belong to topic ${input.startTopicId}`,
    );
  }

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
    nextTopic: next
      ? {
          topicId: next.topicId,
          name: resolveKgDisplayName(next, language),
          concepts: localizeConcepts(next.conceptIds, language),
        }
      : null,
  };
}
