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
  /** Optional one-line hint describing what a good check of THIS concept looks
   * like (the observable skill to test). Consumed only by quiz-block generation,
   * never by mastery scoring. Authored on library concepts (opt-in) and emitted by
   * the graph generator for gen_* graphs. Absent = no authored hint. */
  assessmentHint?: string;
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
  // Optional one-line rationale for why `to` requires `from`. Authored on library
  // source edges (skipped on most; opt-in) and emitted by the graph generator for
  // gen_* graphs. Drives the lesson planner's "why this order" motivation and lets
  // reviewers audit generated edges. Absent = no authored rationale.
  reason?: string;
};

/** Source-level governance state carried into the runtime artifact. Registration
 * in TOPIC_GRAPHS is not approval — see docs/knowledge-graph/catalog.md. */
export type GraphReviewStatus = "approved" | "needs_review";

export type TopicGraph = {
  graphId: string;
  subject: string;
  /** Governance state of the source graph. Absent on older artifacts built before
   * this field existed; treat absent as "approved" so behavior never silently
   * narrows on a stale build. */
  reviewStatus?: GraphReviewStatus;
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

/** Governance state of a registered graph. Absent on artifacts built before the
 * field existed, which is treated as approved so a stale build never silently
 * removes a graph from routing. */
export function getTopicGraphReviewStatus(graphId: string): GraphReviewStatus {
  return TOPIC_GRAPHS[graphId]?.reviewStatus === "needs_review" ? "needs_review" : "approved";
}

/**
 * Whether cold-start goal routing may anchor to `needs_review` graphs.
 *
 * Defaults to permissive. The 10 China/Singapore graphs are currently the only
 * source of that curriculum coverage, and they are overlay supplements whose
 * cross-graph prerequisite edges are not authored yet, so excluding them today
 * would remove the coverage rather than improve it. Set
 * `PRIMORIA_REQUIRE_APPROVED_KG=1` once those edges land and the graphs are
 * approved, to make registration stop implying routability.
 */
export function requiresApprovedGraphsForRouting(): boolean {
  return process.env.PRIMORIA_REQUIRE_APPROVED_KG === "1";
}

/**
 * Graph ids eligible to be *anchored to* by cold-start learning-goal routing.
 *
 * Distinct from `listTopicGraphIds()`, which stays the full registry: an
 * existing course, an explicit graph id, or a direct lookup must keep resolving
 * even when its graph is gated out of new routing.
 */
export function listRoutableTopicGraphIds(): string[] {
  const ids = listTopicGraphIds();
  if (!requiresApprovedGraphsForRouting()) return ids;
  const approved = ids.filter((id) => getTopicGraphReviewStatus(id) === "approved");
  // Never hand routing an empty library: if every graph is unapproved the gate
  // would turn a coverage question into a hard outage.
  return approved.length > 0 ? approved : ids;
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
