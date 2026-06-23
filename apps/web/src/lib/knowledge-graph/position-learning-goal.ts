import { classifyEntry, pickDominantGraph, type BroadMenuItem, type PositioningParams, type PositioningResult } from "./positioning";
import { ALL_KG_GRAPHS, searchKnowledgeGraphNodes, type KnowledgeGraphSearchResponse } from "./search";
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

  // Cross-graph recall (no graphId): collapse to the dominant subject so the rest
  // of positioning runs within a single graph. A concrete graphId is unchanged.
  let search = rawSearch;
  if (rawSearch.graphId === ALL_KG_GRAPHS) {
    const dominant = pickDominantGraph(rawSearch.results);
    if (dominant) {
      search = {
        ...rawSearch,
        graphId: dominant,
        results: rawSearch.results.filter((r) => r.graphId === dominant),
      };
    }
  }

  const result = classifyEntry(search, overrides);
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
