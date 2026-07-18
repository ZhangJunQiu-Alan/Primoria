// Concept-frontier outline builder (pure).
//
// Replaces "one lesson per authored topic" with mastery-aware concept bundles:
// a lesson is 2-3 unmastered concepts taken from the concept prerequisite DAG in
// stable authored order. Mastered concepts drop out, so a partially-known subject
// collapses to fewer/shorter lessons; a fully-known one collapses to none.
//
// Ordering is a priority-Kahn topological sort keyed by authored order
// (topicDefaultOrder, then conceptDefaultOrder). Authored order is the DOMINANT
// key precisely to avoid a depth-first walk down one prerequisite chain, which
// would bundle unrelated concepts. centrality is only a tie-break when authored
// order is fully equal — never a primary sort key, or it would reintroduce the
// same branch-hopping incoherence.
//
// Pure module: no DB, no model, no env, no randomness, no input mutation.

import type { TopicGraph, ConceptPrerequisiteEdge } from "./topic-graph";

export type FrontierConcept = {
  conceptId: string;
  name: string;
  nameZh?: string | null;
  topicId: string;
  topicDefaultOrder: number;
  conceptDefaultOrder: number;
  centrality?: number;
};

export type ConceptBundle = {
  // Teaching order within the lesson is exactly this array order.
  conceptIds: string[];
  // Provenance / navigation anchor: the authored topic of the first concept.
  primaryTopicId: string;
  concepts: FrontierConcept[];
};

const CHUNK_MAX = 3;

// A concept comes before another when its authored position is earlier. centrality
// only breaks a full authored tie; conceptId makes the order total/deterministic.
function authoredKey(c: FrontierConcept): [number, number, number, string] {
  return [c.topicDefaultOrder, c.conceptDefaultOrder, -(c.centrality ?? 0), c.conceptId];
}

function compareKey(a: FrontierConcept, b: FrontierConcept): number {
  const ka = authoredKey(a);
  const kb = authoredKey(b);
  for (let i = 0; i < ka.length; i += 1) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

function indexConcepts(graph: TopicGraph): Map<string, FrontierConcept> {
  const map = new Map<string, FrontierConcept>();
  for (const topic of graph.topics) {
    for (const concept of topic.conceptIds) {
      map.set(concept.conceptId, {
        conceptId: concept.conceptId,
        name: concept.name,
        nameZh: concept.nameZh ?? null,
        topicId: topic.topicId,
        topicDefaultOrder: topic.defaultOrder,
        conceptDefaultOrder: concept.defaultOrder,
        centrality: concept.centrality,
      });
    }
  }
  return map;
}

// Generated (gen_*) graphs ship no conceptEdges: synthesize a single linear chain
// following authored order (same topic: 1→2→3; topic boundary: last→first). This
// matches how generated graphs are authored (strictly linear).
function synthesizeLinearEdges(concepts: Map<string, FrontierConcept>): ConceptPrerequisiteEdge[] {
  const ordered = [...concepts.values()].sort(compareKey);
  const edges: ConceptPrerequisiteEdge[] = [];
  for (let i = 1; i < ordered.length; i += 1) {
    edges.push({ from: ordered[i - 1].conceptId, to: ordered[i].conceptId, strength: "hard" });
  }
  return edges;
}

// specific target → the target plus its transitive HARD prerequisite ancestors.
function hardAncestorClosure(
  target: string,
  edges: ConceptPrerequisiteEdge[],
  concepts: Map<string, FrontierConcept>,
): Set<string> {
  const hardPreds = new Map<string, string[]>();
  for (const e of edges) {
    if (e.strength !== "hard") continue;
    if (!concepts.has(e.from) || !concepts.has(e.to)) continue;
    (hardPreds.get(e.to) ?? hardPreds.set(e.to, []).get(e.to)!).push(e.from);
  }
  const closure = new Set<string>();
  const stack = [target];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (closure.has(node) || !concepts.has(node)) continue;
    closure.add(node);
    for (const pred of hardPreds.get(node) ?? []) stack.push(pred);
  }
  return closure;
}

function requiredScope(input: {
  graph: TopicGraph;
  concepts: Map<string, FrontierConcept>;
  edges: ConceptPrerequisiteEdge[];
  startTopicId: string | null;
  targetConceptId: string | null;
  targetConceptIds?: string[];
}): Set<string> {
  const { graph, concepts, edges, startTopicId, targetConceptId } = input;
  const targets = input.targetConceptIds?.length ? input.targetConceptIds : targetConceptId ? [targetConceptId] : [];
  if (targets.length > 0) {
    const scope = new Set<string>();
    for (const target of targets) {
      if (!concepts.has(target)) continue;
      for (const conceptId of hardAncestorClosure(target, edges, concepts)) scope.add(conceptId);
    }
    if (scope.size > 0) return scope;
  }
  const start = startTopicId ? graph.topics.find((t) => t.topicId === startTopicId) : undefined;
  const startOrder = start?.defaultOrder ?? Number.NEGATIVE_INFINITY;
  const scope = new Set<string>();
  for (const c of concepts.values()) {
    if (c.topicDefaultOrder >= startOrder) scope.add(c.conceptId);
  }
  return scope;
}

// Priority-Kahn over the in-scope prereq subgraph. Readiness uses every in-scope
// prereq edge (hard and soft) so the order is stable; edges to out-of-scope /
// mastered concepts are treated satisfied. Ties broken by authoredKey.
function kahnOrder(
  scope: Set<string>,
  edges: ConceptPrerequisiteEdge[],
  concepts: Map<string, FrontierConcept>,
): FrontierConcept[] {
  const indeg = new Map<string, number>();
  const succ = new Map<string, string[]>();
  for (const id of scope) indeg.set(id, 0);
  for (const e of edges) {
    if (!scope.has(e.from) || !scope.has(e.to)) continue;
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    (succ.get(e.from) ?? succ.set(e.from, []).get(e.from)!).push(e.to);
  }

  const remaining = new Set(scope);
  const order: FrontierConcept[] = [];
  while (remaining.size > 0) {
    let next: FrontierConcept | null = null;
    for (const id of remaining) {
      if ((indeg.get(id) ?? 0) !== 0) continue;
      const c = concepts.get(id)!;
      if (next === null || compareKey(c, next) < 0) next = c;
    }
    if (next === null) {
      // Cyclic / malformed in-scope DAG (validate_kg forbids this). Stay total and
      // deterministic: emit the remainder in authored order.
      const rest = [...remaining].map((id) => concepts.get(id)!).sort(compareKey);
      order.push(...rest);
      break;
    }
    order.push(next);
    remaining.delete(next.conceptId);
    for (const s of succ.get(next.conceptId) ?? []) indeg.set(s, (indeg.get(s) ?? 0) - 1);
  }
  return order;
}

function chunk(ordered: FrontierConcept[]): ConceptBundle[] {
  const bundles: ConceptBundle[] = [];
  for (let i = 0; i < ordered.length; i += CHUNK_MAX) {
    const group = ordered.slice(i, i + CHUNK_MAX);
    bundles.push({
      conceptIds: group.map((c) => c.conceptId),
      primaryTopicId: group[0].topicId,
      concepts: group,
    });
  }
  return bundles;
}

// Ordered concept bundles for a course outline. Empty when nothing remains to
// learn (every required concept is mastered) — the caller decides how to degrade.
export function buildConceptFrontierOutline(input: {
  graph: TopicGraph;
  startTopicId: string | null;
  targetConceptId: string | null;
  targetConceptIds?: string[];
  masteredConceptIds: ReadonlySet<string>;
}): ConceptBundle[] {
  const { graph, startTopicId, targetConceptId, masteredConceptIds } = input;
  const concepts = indexConcepts(graph);
  if (concepts.size === 0) return [];
  const edges = graph.conceptEdges ?? synthesizeLinearEdges(concepts);

  const required = requiredScope({
    graph,
    concepts,
    edges,
    startTopicId,
    targetConceptId,
    targetConceptIds: input.targetConceptIds,
  });
  const scope = new Set<string>();
  for (const id of required) {
    if (!masteredConceptIds.has(id)) scope.add(id);
  }
  if (scope.size === 0) return [];

  return chunk(kahnOrder(scope, edges, concepts));
}
