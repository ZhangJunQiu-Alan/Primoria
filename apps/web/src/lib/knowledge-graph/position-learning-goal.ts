import {
  finalizeStage2,
  resolvePositioningParams,
  safeDefault,
  type FinalizeContext,
  type GraphCandidateLite,
  type PositioningDiagnostics,
  type PositioningMode,
  type PositioningParams,
  type PositioningResult,
  type SubjectCandidate,
} from "./positioning";
import { runStage2Positioning } from "./positioning-llm";
import { runFreeformGoalGate } from "./freeform-goal-gate";
import {
  ALL_KG_GRAPHS,
  makeEmptyKnowledgeGraphSearchResponse,
  searchKnowledgeGraphNodes,
  type KnowledgeGraphSearchResponse,
  type KnowledgeGraphSearchResult,
} from "./search";
import {
  allowKgInfraFallback,
  classifyKnowledgeGraphFailure,
  KnowledgeGraphUnavailableError,
} from "./errors";
import { buildGraphCandidates } from "./graph-router";
import { detectKgLanguage } from "./display-name";
import { getTopicGraph, listTopicGraphIds } from "./topic-graph";
import type { CourseContext, CourseContextTopic } from "./course-context";

export type { CourseContext, CourseContextTopic } from "./course-context";

// Shared "position a learning goal in the KG" core, reused by the Next route
// handler (/api/knowledge-graph/position) and the onboarding goal resolver.
// Pipeline: cross-graph recall -> relevance floor gate -> candidate subjects ->
// margin (1 vs top-N graphs) -> one Stage-2 LLM call (positioning-llm) ->
// pure validation/guardrails (finalizeStage2). No softmax/threshold heuristic.

export type PositionLearningGoalInput = {
  query: string;
  graphId?: string;
  topK?: number;
  modelVersion?: string;
  floor?: number;
  // User-facing locale for topic/concept display names. When omitted it is
  // inferred from the query text (CJK => "zh").
  language?: string;
};

export type PositionLearningGoalResult = {
  result: PositioningResult;
  search: KnowledgeGraphSearchResponse;
};

export type PositionLearningGoalDeps = {
  searchKnowledgeGraphNodes?: typeof searchKnowledgeGraphNodes;
  runStage2Positioning?: typeof runStage2Positioning;
  runFreeformGoalGate?: typeof runFreeformGoalGate;
};

export type PositioningPlan =
  | { branch: "positioned"; mode: PositioningMode; courseContext: CourseContext }
  | { branch: "clarify_subject"; message: string; candidates: SubjectCandidate[] }
  | { branch: "out_of_library"; topic: string; message: string }
  | { branch: "fallback"; message: string };

function resultTopicId(r: KnowledgeGraphSearchResult): string | null {
  return r.kind === "topic" ? r.nodeId : r.topicId;
}

function listLibrarySubjects(): Array<{ graphId: string; subject: string }> {
  const out: Array<{ graphId: string; subject: string }> = [];
  for (const graphId of listTopicGraphIds()) {
    try {
      out.push({ graphId, subject: getTopicGraph(graphId).subject || graphId });
    } catch {
      // skip dirty ids
    }
  }
  return out;
}

function buildDiagnostics(
  maxSimilarity: number,
  candidates: GraphCandidateLite[],
): PositioningDiagnostics {
  return {
    maxSimilarity,
    candidateGraphs: candidates.map((c) => ({ graphId: c.graphId, bestSimilarity: c.bestSimilarity })),
  };
}

export async function positionLearningGoal(
  input: PositionLearningGoalInput,
  deps: PositionLearningGoalDeps = {},
): Promise<PositionLearningGoalResult> {
  // Distinguish KG coverage miss from KG infrastructure failure. A broken KG
  // (missing table, dead DB, dead embedding provider) must fail loudly instead
  // of silently rerouting every goal into the freeform gate / gen_* graphs.
  // Only kg_schema_missing may degrade, and only behind the explicit dev flag.
  let search: KnowledgeGraphSearchResponse;
  try {
    search = await (deps.searchKnowledgeGraphNodes ?? searchKnowledgeGraphNodes)(input);
  } catch (error) {
    const kind = classifyKnowledgeGraphFailure(error);
    if (kind === "kg_schema_missing" && allowKgInfraFallback()) {
      console.warn("[kg] degraded fallback enabled: kg_schema_missing -> freeform gate", error);
      search = makeEmptyKnowledgeGraphSearchResponse(input);
    } else {
      throw new KnowledgeGraphUnavailableError(kind, error);
    }
  }
  const overrides: Partial<PositioningParams> = {};
  if (input.floor !== undefined) overrides.floor = input.floor;
  const params = resolvePositioningParams(overrides);
  const language = input.language ?? detectKgLanguage(input.query);
  const librarySubjects = listLibrarySubjects();

  const maxSimilarity = search.results.length ? Math.max(...search.results.map((r) => r.similarity)) : 0;

  // Relevance floor gate: nothing in the library is close enough for grounded
  // positioning. Give real, teachable out-of-library goals one lightweight
  // chance to route into generated-graph course creation instead of silently
  // collapsing everything to fallback.
  if (search.results.length === 0 || maxSimilarity < params.floor) {
    const ctx: FinalizeContext = {
      candidates: [],
      librarySubjects,
      hitTopicIdsByGraph: new Map(),
      language,
      diagnostics: buildDiagnostics(maxSimilarity, []),
      params,
    };
    const decision = await (deps.runFreeformGoalGate ?? runFreeformGoalGate)({
      query: input.query,
      language,
      librarySubjects,
    });
    const result = decision ? finalizeStage2(decision, ctx) : safeDefault(ctx);
    if (result.branch === "out_of_library" && !result.freeformTopic) {
      result.freeformTopic = search.encodedQuery.coreQuery;
    }
    if (result.branch === "fallback" && !result.graphId) {
      result.graphId = search.graphId;
    }
    return { result, search };
  }

  const candidates = buildGraphCandidates(search.results, undefined, search.encodedQuery.coreQuery).map(
    (c): GraphCandidateLite => ({ graphId: c.graphId, subject: c.subject, bestSimilarity: c.bestSimilarity }),
  );

  // Margin: if the top subject clearly dominates, position inside it alone;
  // otherwise hand the top-N graphs to Stage 2 to pick + position in one call.
  const dominates =
    candidates.length <= 1 ||
    candidates[0].bestSimilarity - candidates[1].bestSimilarity >= params.marginWindow;
  const selected = dominates ? candidates.slice(0, 1) : candidates.slice(0, params.maxStage2Graphs);

  // Recall-hit topic ids per graph, for the directed guardrail.
  const hitTopicIdsByGraph = new Map<string, Set<string>>();
  for (const r of search.results) {
    const topicId = resultTopicId(r);
    if (!topicId) continue;
    const set = hitTopicIdsByGraph.get(r.graphId) ?? new Set<string>();
    set.add(topicId);
    hitTopicIdsByGraph.set(r.graphId, set);
  }

  const ctx: FinalizeContext = {
    candidates: selected,
    librarySubjects,
    hitTopicIdsByGraph,
    language,
    diagnostics: buildDiagnostics(maxSimilarity, selected),
    params,
  };

  const decision = await (deps.runStage2Positioning ?? runStage2Positioning)(
    {
      query: input.query,
      language,
      graphs: selected.map((c) => ({ graphId: c.graphId, subject: c.subject })),
      librarySubjects,
    },
    undefined,
  );
  const result = decision ? finalizeStage2(decision, ctx) : safeDefault(ctx);
  if (result.branch === "out_of_library" && !result.freeformTopic) {
    result.freeformTopic = search.encodedQuery.coreQuery;
  }

  // Surface the resolved graph on the search response so logging/events record
  // the real subject rather than the cross-graph sentinel.
  const resolvedSearch =
    result.graphId && result.graphId !== ALL_KG_GRAPHS
      ? { ...search, graphId: result.graphId }
      : search;

  return { result, search: resolvedSearch };
}

// Pure: turn a positioning result into the next action a caller takes.
// positioned -> course context for generation; clarify_subject -> subject chips;
// fallback -> message.
export function planFromPositioning(result: PositioningResult): PositioningPlan {
  if (result.branch === "clarify_subject") {
    return {
      branch: "clarify_subject",
      message: result.message ?? "",
      candidates: result.candidates ?? [],
    };
  }
  if (result.branch === "out_of_library") {
    return { branch: "out_of_library", topic: result.freeformTopic ?? "", message: result.message ?? "" };
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
    branch: "positioned",
    mode: result.mode ?? "subject_start",
    courseContext: {
      learningPathType: "linear",
      graphId: result.graphId,
      startTopic,
      targetConceptId: result.targetConceptId ?? null,
      nextTopic: next ? { topicId: next.topicId, name: next.name, concepts: next.concepts } : null,
    },
  };
}
