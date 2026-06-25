import { getTopic, getTopicGraph, nextTopic, type TopicConcept } from "./topic-graph";
import type { KnowledgeGraphSearchResponse, KnowledgeGraphSearchResult } from "./search";
import { type KgLanguage, localizeConcepts, resolveKgDisplayName } from "./display-name";

// Cold-start entry positioning (route B, block 4).
//
// Recall (search.ts) returns top-k topic/concept hits. We turn the raw
// similarities into a softmax distribution, aggregate the probability mass per
// topic, and route to one of three behaviours:
//   - specific: one topic holds most of the mass (or a single concept clearly
//     dominates) -> build that topic + the next topic as a 2-lesson linear path.
//   - broad: mass is spread across topics -> return a relevance-filtered menu of
//     hit topics for the user to pick.
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
export const DEFAULT_KG_BROAD_MENU_SIMILARITY_WINDOW = 0.1;

export type PositioningParams = {
  tau: number;
  floor: number;
  temperature: number;
  conceptHighFloor: number;
  conceptMargin: number;
  menuSize: number;
  menuSimilarityWindow: number;
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
    menuSimilarityWindow:
      overrides.menuSimilarityWindow
      ?? env("KG_BROAD_MENU_SIMILARITY_WINDOW", DEFAULT_KG_BROAD_MENU_SIMILARITY_WINDOW),
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

function buildLinearPath(
  graphId: string,
  startTopicId: string,
  targetConceptId: string | null,
  language: KgLanguage,
): {
  startTopicId: string;
  targetConceptId: string | null;
  linear: boolean;
  path: LessonPlan[];
} {
  const start = getTopic(graphId, startTopicId);
  const path: LessonPlan[] = [];
  if (start) {
    path.push({
      order: 1,
      topicId: start.topicId,
      name: resolveKgDisplayName(start, language),
      concepts: localizeConcepts(start.conceptIds, language),
    });
    const next = nextTopic(graphId, startTopicId);
    if (next) {
      path.push({
        order: 2,
        topicId: next.topicId,
        name: resolveKgDisplayName(next, language),
        concepts: localizeConcepts(next.conceptIds, language),
      });
    }
  }
  return { startTopicId, targetConceptId, linear: path.length > 1, path };
}

export function classifyEntry(
  search: Pick<KnowledgeGraphSearchResponse, "graphId" | "results">,
  overrides: Partial<PositioningParams> = {},
  language: KgLanguage = null,
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
    return { branch: "specific", graphId, params, diagnostics, ...buildLinearPath(graphId, startTopicId, targetConceptId, language) };
  }

  // Broad: keep only topics close to the best topic hit and preserve relevance
  // order. default_order remains a deterministic tie-breaker and is still used
  // after selection to build the course sequence.
  const graph = getTopicGraph(graphId);
  const topicById = new Map(graph.topics.map((topic) => [topic.topicId, topic]));
  const topicSimilarity = new Map<string, number>();
  for (const result of results) {
    const topicId = resultTopicId(result);
    if (!topicId) continue;
    topicSimilarity.set(topicId, Math.max(topicSimilarity.get(topicId) ?? -Infinity, result.similarity));
  }
  const bestTopicSimilarity = Math.max(...topicSimilarity.values());
  const menuFloor = Math.max(params.floor, bestTopicSimilarity - params.menuSimilarityWindow);
  const menu: BroadMenuItem[] = [...topicSimilarity.entries()]
    .map(([topicId, similarity]) => ({ topic: topicById.get(topicId), similarity }))
    .filter((entry): entry is { topic: NonNullable<typeof entry.topic>; similarity: number } =>
      Boolean(entry.topic) && entry.similarity >= menuFloor,
    )
    .sort((a, b) => b.similarity - a.similarity || a.topic.defaultOrder - b.topic.defaultOrder)
    .slice(0, params.menuSize)
    .map(({ topic }) => ({
      topicId: topic.topicId,
      name: resolveKgDisplayName(topic, language),
      defaultOrder: topic.defaultOrder,
      concepts: localizeConcepts(topic.conceptIds, language),
    }));

  return { branch: "broad", graphId, params, menu, diagnostics };
}
