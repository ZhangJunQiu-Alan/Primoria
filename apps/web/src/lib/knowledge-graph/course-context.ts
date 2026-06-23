import { getTopic, nextTopic, type TopicConcept } from "./topic-graph";

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
  return {
    learningPathType: "linear",
    graphId: input.graphId,
    startTopic: { topicId: start.topicId, name: start.name, concepts: start.conceptIds },
    targetConceptId,
    nextTopic: next ? { topicId: next.topicId, name: next.name, concepts: next.conceptIds } : null,
  };
}
