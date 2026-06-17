import { getTopic, getTopicGraph, nextTopic, type TopicConcept } from "./topic-graph";
import type { KnowledgeGraphSearchResponse, KnowledgeGraphSearchResult } from "./search";

// Cold-start entry positioning (route B, block 4).
//
// Recall (search.ts) returns top-k topic/concept hits. We turn the raw
// similarities into a softmax distribution, aggregate the probability mass per
// topic, and route to one of three behaviours:
//   - specific: one topic holds most of the mass (or a single concept clearly
//     dominates) -> build that topic + the next topic as a 2-lesson linear path.
//   - broad: mass is spread across topics -> return a menu of hit topics ordered
//     by default_order (the recommended learning order) for the user to pick.
//   - fallback: nothing is relevant enough -> ask for a more specific goal.
//
// Two intuitive tunables (TAU/FLOOR) drive the boundaries and are meant to be
// calibrated from logged real queries (log-and-tune). TEMPERATURE sharpens the
// softmax so close cosine scores still concentrate; it rarely needs tuning.

export const DEFAULT_KG_POSITION_TAU = 0.6; // specific if top topic mass >= TAU
export const DEFAULT_KG_POSITION_FLOOR = 0.28; // fallback if max similarity < FLOOR
export const DEFAULT_KG_POSITION_TEMPERATURE = 0.1;
export const DEFAULT_KG_POSITION_CONCEPT_HIGH_FLOOR = 0.5; // a concept "clearly high"
export const DEFAULT_KG_POSITION_CONCEPT_MARGIN = 0.06; // gap over 2nd concept
export const DEFAULT_KG_BROAD_MENU_SIZE = 5;

export type PositioningParams = {
  tau: number;
  floor: number;
  temperature: number;
  conceptHighFloor: number;
  conceptMargin: number;
  menuSize: number;
};

export type PositioningBranch = "specific" | "broad" | "fallback";

export type LessonPlan = {
  order: number;
  topicId: string;
  name: string;
  concepts: TopicConcept[];
};

export type BroadMenuItem = {
  topicId: string;
  name: string;
  defaultOrder: number;
  concepts: TopicConcept[];
};

export type PositioningDiagnostics = {
  maxSimilarity: number;
  topicMass: Array<{ topicId: string; mass: number }>;
  topConcept: { nodeId: string; topicId: string | null; similarity: number } | null;
};

export type PositioningResult = {
  branch: PositioningBranch;
  graphId: string;
  params: PositioningParams;
  // specific
  startTopicId?: string;
  targetConceptId?: string | null;
  linear?: boolean;
  path?: LessonPlan[];
  // broad
  menu?: BroadMenuItem[];
  // fallback
  message?: string;
  diagnostics: PositioningDiagnostics;
};

export const FALLBACK_MESSAGE =
  "没找到匹配的内容,请重新输入更具体的学习目标,或联系我们添加相关课程内容。";

export function resolvePositioningParams(overrides: Partial<PositioningParams> = {}): PositioningParams {
  const env = (key: string, fallback: number) => {
    const raw = process.env[key];
    const num = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(num) ? num : fallback;
  };
  return {
    tau: overrides.tau ?? env("KG_POSITION_TAU", DEFAULT_KG_POSITION_TAU),
    floor: overrides.floor ?? env("KG_POSITION_FLOOR", DEFAULT_KG_POSITION_FLOOR),
    temperature: overrides.temperature ?? env("KG_POSITION_TEMPERATURE", DEFAULT_KG_POSITION_TEMPERATURE),
    conceptHighFloor: overrides.conceptHighFloor ?? DEFAULT_KG_POSITION_CONCEPT_HIGH_FLOOR,
    conceptMargin: overrides.conceptMargin ?? DEFAULT_KG_POSITION_CONCEPT_MARGIN,
    menuSize: overrides.menuSize ?? DEFAULT_KG_BROAD_MENU_SIZE,
  };
}

function softmax(values: number[], temperature: number): number[] {
  const t = temperature > 0 ? temperature : 1;
  const scaled = values.map((v) => v / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

function resultTopicId(r: KnowledgeGraphSearchResult): string | null {
  return r.kind === "topic" ? r.nodeId : r.topicId;
}

function buildLinearPath(graphId: string, startTopicId: string, targetConceptId: string | null): {
  startTopicId: string;
  targetConceptId: string | null;
  linear: boolean;
  path: LessonPlan[];
} {
  const start = getTopic(graphId, startTopicId);
  const path: LessonPlan[] = [];
  if (start) {
    path.push({ order: 1, topicId: start.topicId, name: start.name, concepts: start.conceptIds });
    const next = nextTopic(graphId, startTopicId);
    if (next) path.push({ order: 2, topicId: next.topicId, name: next.name, concepts: next.conceptIds });
  }
  return { startTopicId, targetConceptId, linear: path.length > 1, path };
}

// Cross-graph recall returns hits from every graph. Pick the dominant subject by
// summing similarity per graph_id; the winning graph is then positioned in
// isolation by classifyEntry. Returns null when there are no results.
export function pickDominantGraph(results: KnowledgeGraphSearchResult[]): string | null {
  if (results.length === 0) return null;

  // 1. Calculate mass with concept/topic weights (concept is 1.0, topic is 0.5)
  const mass = new Map<string, number>();
  for (const r of results) {
    const weight = r.kind === "concept" ? 1.0 : 0.5;
    const score = Math.max(r.similarity, 0) * weight;
    mass.set(r.graphId, (mass.get(r.graphId) ?? 0) + score);
  }

  // 2. Identify top hits from different graphs to calculate margin
  const top1 = results[0];
  const top2 = results.find(r => r.graphId !== top1.graphId);

  // Apply a dynamic bonus for the top-matching graph.
  // If the absolute top hit is a concept and it significantly beats the next competitor
  // in a different graph, we boost it to avoid "crowding out".
  // If the difference is tiny, they are essentially a tie, so no large bonus is applied.
  if (top1 && top1.similarity > 0) {
    let bonus = 0;
    const margin = top2 ? (top1.similarity - top2.similarity) : top1.similarity;
    if (margin > 0.025) {
      bonus = top1.similarity * 2.0;
    } else {
      bonus = top1.similarity * 0.1;
    }
    mass.set(top1.graphId, (mass.get(top1.graphId) ?? 0) + bonus);
  }

  // 3. Find the winning graph
  let best: string | null = null;
  let bestMass = -Infinity;
  for (const [graphId, m] of mass) {
    if (m > bestMass) {
      bestMass = m;
      best = graphId;
    }
  }

  // 4. Resolve ties or near-ties with A-Level tie-breaker
  if (best) {
    const threshold = bestMass * 0.9;
    for (const [graphId, m] of mass) {
      if (graphId !== best && m >= threshold) {
        if (graphId.startsWith("a_level_") && !best.startsWith("a_level_")) {
          best = graphId;
          bestMass = m;
        }
      }
    }
  }

  return best;
}

export function classifyEntry(
  search: Pick<KnowledgeGraphSearchResponse, "graphId" | "results">,
  overrides: Partial<PositioningParams> = {},
): PositioningResult {
  const params = resolvePositioningParams(overrides);
  const graphId = search.graphId;
  const results = search.results;

  const maxSimilarity = results.length ? Math.max(...results.map((r) => r.similarity)) : 0;

  const concepts = results.filter((r) => r.kind === "concept").sort((a, b) => b.similarity - a.similarity);
  const topConcept = concepts[0]
    ? { nodeId: concepts[0].nodeId, topicId: concepts[0].topicId, similarity: concepts[0].similarity }
    : null;

  // Topic mass via softmax over all hit similarities.
  const weights = softmax(results.map((r) => r.similarity), params.temperature);
  const massMap = new Map<string, number>();
  results.forEach((r, i) => {
    const tid = resultTopicId(r);
    if (!tid) return;
    massMap.set(tid, (massMap.get(tid) ?? 0) + weights[i]);
  });
  const topicMass = [...massMap.entries()]
    .map(([topicId, mass]) => ({ topicId, mass }))
    .sort((a, b) => b.mass - a.mass);

  const diagnostics: PositioningDiagnostics = { maxSimilarity, topicMass, topConcept };

  // Fallback: not relevant enough / out of graph.
  if (results.length === 0 || maxSimilarity < params.floor) {
    return { branch: "fallback", graphId, params, message: FALLBACK_MESSAGE, diagnostics };
  }

  const top = topicMass[0];
  const massConcentrated = top !== undefined && top.mass >= params.tau;

  const secondConceptSim = concepts[1]?.similarity ?? -Infinity;
  const conceptDominant =
    topConcept !== null &&
    topConcept.similarity >= params.conceptHighFloor &&
    topConcept.similarity - secondConceptSim >= params.conceptMargin;

  if (massConcentrated || conceptDominant) {
    const startTopicId = massConcentrated ? top.topicId : (topConcept?.topicId ?? top.topicId);
    const targetConceptId =
      topConcept && topConcept.topicId === startTopicId ? topConcept.nodeId : null;
    return { branch: "specific", graphId, params, diagnostics, ...buildLinearPath(graphId, startTopicId, targetConceptId) };
  }

  // Broad: menu of hit topics, ordered by default_order (recommended path), top N.
  const graph = getTopicGraph(graphId);
  const hitTopicIds = [...new Set(results.map(resultTopicId).filter((t): t is string => Boolean(t)))];
  const menu: BroadMenuItem[] = hitTopicIds
    .map((tid) => graph.topics.find((t) => t.topicId === tid))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .slice(0, params.menuSize)
    .map((t) => ({ topicId: t.topicId, name: t.name, defaultOrder: t.defaultOrder, concepts: t.conceptIds }));

  return { branch: "broad", graphId, params, menu, diagnostics };
}
