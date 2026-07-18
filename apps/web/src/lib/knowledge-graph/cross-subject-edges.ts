import artifact from "./data/cross-subject-edges.generated.json";
import { getTopicGraph } from "./topic-graph";

type CrossSubjectEdge = {
  from: string;
  to: string;
  strength: "hard" | "soft";
  fromGraphId: string;
  toGraphId: string;
};

const CROSS_SUBJECT_EDGES = artifact.edges as CrossSubjectEdge[];

export function selectDeterministicGoalTargets(
  graphId: string,
  contextGraphIds: readonly string[],
): string[] {
  if (contextGraphIds.length === 0) return [];

  const context = new Set(contextGraphIds);
  const graph = getTopicGraph(graphId);
  const validConceptIds = new Set(
    graph.topics.flatMap((topic) => topic.conceptIds.map((concept) => concept.conceptId)),
  );
  const targets = new Set(
    CROSS_SUBJECT_EDGES.filter(
      (edge) =>
        edge.fromGraphId === graphId &&
        context.has(edge.toGraphId) &&
        validConceptIds.has(edge.from),
    ).map((edge) => edge.from),
  );

  if (targets.size === 0) return [];

  const crossSubjectTargets = new Set(targets);
  for (const edge of graph.conceptEdges ?? []) {
    if (edge.strength === "soft" && crossSubjectTargets.has(edge.from)) targets.add(edge.to);
  }

  const order = new Map(
    graph.topics.flatMap((topic) =>
      topic.conceptIds.map((concept) => [
        concept.conceptId,
        [topic.defaultOrder, concept.defaultOrder] as const,
      ]),
    ),
  );
  return [...targets].sort((a, b) => {
    const left = order.get(a) ?? [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    const right = order.get(b) ?? [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    return left[0] - right[0] || left[1] - right[1] || a.localeCompare(b);
  });
}
