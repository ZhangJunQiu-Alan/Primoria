import { DEFAULT_TOPIC_GRAPH_ID, TOPIC_GRAPHS } from "./data/topic-graphs.generated";

export type TopicConcept = {
  conceptId: string;
  name: string;
  defaultOrder: number;
};

export type TopicSuccessor = {
  topicId: string;
  hard: boolean;
};

export type TopicNode = {
  topicId: string;
  name: string;
  defaultOrder: number;
  conceptIds: TopicConcept[];
  successors: TopicSuccessor[];
  prereqTopics: string[];
  isRoot: boolean;
};

export type TopicGraph = {
  graphId: string;
  subject: string;
  topics: TopicNode[];
};

export { DEFAULT_TOPIC_GRAPH_ID } from "./data/topic-graphs.generated";

export function listTopicGraphIds(): string[] {
  return Object.keys(TOPIC_GRAPHS);
}

export function getTopicGraph(graphId: string = DEFAULT_TOPIC_GRAPH_ID): TopicGraph {
  const graph = TOPIC_GRAPHS[graphId];
  if (!graph) throw new Error(`Unknown topic graph: ${graphId}`);
  return graph;
}

export function getTopic(graphId: string, topicId: string): TopicNode | undefined {
  return getTopicGraph(graphId).topics.find((t) => t.topicId === topicId);
}

/**
 * Next topic for the linear two-lesson path: among topic-DAG successors, prefer
 * those reachable by a hard prereq edge, then pick the smallest default_order
 * (default_order is the curriculum's recommended learning order). Returns null
 * when the start topic is a leaf — the path is then a single lesson.
 */
export function nextTopic(graphId: string, topicId: string): TopicNode | null {
  const topic = getTopic(graphId, topicId);
  if (!topic || topic.successors.length === 0) return null;

  const hard = topic.successors.filter((s) => s.hard);
  const pool = hard.length > 0 ? hard : topic.successors;
  // successors are already default_order-sorted in the artifact.
  const next = getTopic(graphId, pool[0].topicId);
  return next ?? null;
}
