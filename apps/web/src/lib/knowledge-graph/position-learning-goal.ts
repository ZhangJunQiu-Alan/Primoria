import { classifyEntry, resolvePositioningParams, FALLBACK_MESSAGE, type BroadMenuItem, type PositioningParams, type PositioningResult } from "./positioning";
import { ALL_KG_GRAPHS, searchKnowledgeGraphNodes, type KnowledgeGraphSearchResponse } from "./search";
import { buildGraphCandidates, routeDominantGraph } from "./graph-router";
import { detectKgLanguage } from "./display-name";
import type { CourseContext, CourseContextTopic } from "./course-context";

export type { CourseContext, CourseContextTopic } from "./course-context";

// Shared "position a learning goal in the KG" core, reused by both the Next route
// handler (/api/knowledge-graph/position) and — over HTTP — the LangGraph agent's
// position_learning_goal tool. Keep the heavy/impure recall (search.ts) here; the
// branch -> action mapping (planFromPositioning) is pure and unit-testable.

export type PositionLearningGoalInput = {
  query: string;
  graphId?: string;
  topK?: number;
  modelVersion?: string;
  tau?: number;
  floor?: number;
  // User-facing locale for topic/concept display names. When omitted it is
  // inferred from the query text (CJK => "zh").
  language?: string;
};

export type PositionLearningGoalResult = {
  result: PositioningResult;
  search: KnowledgeGraphSearchResponse;
};

export type PositioningPlan =
  | { branch: "specific"; courseContext: CourseContext }
  | { branch: "broad"; menu: BroadMenuItem[] }
  | { branch: "fallback"; message: string };

export async function positionLearningGoal(
  input: PositionLearningGoalInput,
): Promise<PositionLearningGoalResult> {
  const rawSearch = await searchKnowledgeGraphNodes(input);
  const overrides: Partial<PositioningParams> = {};
  if (input.tau !== undefined) overrides.tau = input.tau;
  if (input.floor !== undefined) overrides.floor = input.floor;

  // Cross-graph recall (no graphId): LLM routing picks the single subject among
  // the recalled candidates (handles aliases and cross-language goals), then the
  // rest of positioning runs within that one graph. If no subject can be picked,
  // ask the user for a more specific goal. A concrete graphId is unchanged.
  let search = rawSearch;
  if (rawSearch.graphId === ALL_KG_GRAPHS) {
    const candidates = buildGraphCandidates(rawSearch.results);
    const routed = await routeDominantGraph(input.query, candidates);
    if (!routed) {
      const params = resolvePositioningParams(overrides);
      const maxSimilarity = rawSearch.results.length
        ? Math.max(...rawSearch.results.map((r) => r.similarity))
        : 0;
      return {
        result: {
          branch: "fallback",
          graphId: ALL_KG_GRAPHS,
          params,
          message: FALLBACK_MESSAGE,
          diagnostics: { maxSimilarity, topicMass: [], topConcept: null },
        },
        search: rawSearch,
      };
    }
    search = {
      ...rawSearch,
      graphId: routed,
      results: rawSearch.results.filter((r) => r.graphId === routed),
    };
  }

  const language = input.language ?? detectKgLanguage(input.query);
  const result = classifyEntry(search, overrides, language);
  return { result, search };
}

// Pure: turn a positioning result into the next action the agent should take.
// specific -> course context for generation; broad -> menu; fallback -> message.
export function planFromPositioning(result: PositioningResult): PositioningPlan {
  if (result.branch === "broad") {
    return { branch: "broad", menu: result.menu ?? [] };
  }
  if (result.branch === "fallback") {
    return { branch: "fallback", message: result.message ?? "" };
  }

  const path = result.path ?? [];
  const start = path[0];
  const next = path[1] ?? null;
  const startTopic: CourseContextTopic = start
    ? { topicId: start.topicId, name: start.name, concepts: start.concepts }
    : { topicId: result.startTopicId ?? "", name: result.startTopicId ?? "", concepts: [] };

  return {
    branch: "specific",
    courseContext: {
      learningPathType: "linear",
      graphId: result.graphId,
      startTopic,
      targetConceptId: result.targetConceptId ?? null,
      nextTopic: next ? { topicId: next.topicId, name: next.name, concepts: next.concepts } : null,
    },
  };
}
