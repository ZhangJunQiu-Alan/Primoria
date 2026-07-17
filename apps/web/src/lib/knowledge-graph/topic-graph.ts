import { DEFAULT_TOPIC_GRAPH_ID, TOPIC_GRAPHS } from "./data/topic-graphs.generated";

/** Concept visualization affordance from the KG (data/knowledge-graphs/source/*.json `visual`). Maps to
 * a course visual engine: interactive→html, simulation→physics,
 * algorithm→algorithm_visualizer, function→math_explorer, chart→echarts,
 * diagram→mermaid. Absent = no forced visual. */
export type ConceptVisual =
  | "interactive"
  | "simulation"
  | "algorithm"
  | "function"
  | "chart"
  | "diagram";

export type TopicConcept = {
  conceptId: string;
  name: string;
  nameZh?: string | null;
  defaultOrder: number;
  visual?: ConceptVisual;
  visualHint?: string;
  /** Global reverse-PageRank importance (0..1, max-normalized) over the whole KG
   * prerequisite graph: how load-bearing this concept is (how much depends on it).
   * Distinct from defaultOrder (local teaching sequence). Absent = uncomputed. */
  centrality?: number;
};

export type TopicSuccessor = {
  topicId: string;
  hard: boolean;
};

export type TopicNode = {
  topicId: string;
  name: string;
  nameZh?: string | null;
  defaultOrder: number;
  conceptIds: TopicConcept[];
  successors: TopicSuccessor[];
  prereqTopics: string[];
  isRoot: boolean;
};

export type ConceptPrerequisiteEdge = {
  from: string;
  to: string;
  strength: "hard" | "soft";
};

export type TopicGraph = {
  graphId: string;
  subject: string;
  topics: TopicNode[];
  // Concept-grain prereq DAG, kept alongside the topic DAG for the concept
  // frontier outline builder. Present on library artifacts; absent on generated
  // (gen_*) graphs, where the frontier builder synthesizes linear edges from
  // topic/concept order.
  conceptEdges?: ConceptPrerequisiteEdge[];
  // Generated (gen_*) graphs only: the graph-generation LLM judged this subject
  // code-adapted, so lessons may include code blocks without matching the
  // lexical patterns in code-eligibility.ts. Absent on curated library graphs.
  codeAdapted?: boolean;
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

/** The topic that owns a concept (used to place a remediation lesson). */
export function findTopicByConcept(graphId: string, conceptId: string): TopicNode | undefined {
  return getTopicGraph(graphId).topics.find((t) => t.conceptIds.some((c) => c.conceptId === conceptId));
}

/**
 * Next topic in the curriculum outline. The Course outline is built from
 * default_order, so post-lesson progression must use the same ordering instead
 * of selecting an arbitrary prerequisite-DAG branch.
 */
export function nextTopic(graphId: string, topicId: string): TopicNode | null {
  const graph = getTopicGraph(graphId);
  const topic = graph.topics.find((candidate) => candidate.topicId === topicId);
  if (!topic) return null;
  return graph.topics.find((candidate) => candidate.defaultOrder > topic.defaultOrder) ?? null;
}
