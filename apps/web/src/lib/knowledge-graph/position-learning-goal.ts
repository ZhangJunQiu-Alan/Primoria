import {
  finalizeStage2,
  buildLinearPath,
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
import { selectGoalScope } from "./goal-scope-selector";
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
import {
  findExplicitSubjectGraphIds,
  findPrimarySubjectGraphId,
  getKnowledgeGraphSubjectLabel,
  hasCompositionConnector,
  hasGoalScopeModifier,
} from "./subject-aliases";
import { detectKgLanguage, type KgLanguage } from "./display-name";
import { getTopicGraph, listTopicGraphIds } from "./topic-graph";
import { selectDeterministicGoalTargets } from "./cross-subject-edges";
import {
  CURRICULUM_SYSTEM_LABELS,
  resolveCurriculumRoute,
  type LearnerCurriculumContext,
} from "./curriculum-routing";
import type { CourseContext, CourseContextTopic } from "./course-context";
import { classifyDeterministicGoal, findExactNamedGoalAnchor } from "./goal-routing-policy";

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
  // Server-derived, bounded context from confirmed profile fields or explicit
  // learner facts. UI language, timezone, and IP location cannot confirm it.
  curriculumContext?: LearnerCurriculumContext | null;
};

export type PositionLearningGoalResult = {
  result: PositioningResult;
  search: KnowledgeGraphSearchResponse;
};

export type PositionLearningGoalDeps = {
  searchKnowledgeGraphNodes?: typeof searchKnowledgeGraphNodes;
  runStage2Positioning?: typeof runStage2Positioning;
  runFreeformGoalGate?: typeof runFreeformGoalGate;
  selectGoalScope?: typeof selectGoalScope;
  failOnModelError?: boolean;
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
      out.push({ graphId, subject: getKnowledgeGraphSubjectLabel(graphId, "en") });
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

async function resolveGoalScopedResult(
  result: PositioningResult,
  input: PositionLearningGoalInput,
  language: KgLanguage,
  deps: PositionLearningGoalDeps,
  deterministicTargetConceptIds: readonly string[],
): Promise<PositioningResult> {
  if (result.branch !== "positioned" || result.mode !== "goal_scoped") return result;
  const selection =
    deterministicTargetConceptIds.length > 0
      ? {
          coverage: "full" as const,
          targetConceptIds: [...deterministicTargetConceptIds],
          reason: "approved_cross_subject_prerequisites",
        }
      : await (deps.selectGoalScope ?? selectGoalScope)({
          query: input.query,
          graphId: result.graphId,
          language,
          failOnModelError: deps.failOnModelError,
        });
  if (!selection || selection.coverage === "partial") {
    return {
      branch: "out_of_library",
      graphId: "",
      params: result.params,
      freeformTopic: input.query.trim(),
      diagnostics: result.diagnostics,
    };
  }

  const graph = getTopicGraph(result.graphId);
  const targets = new Set(selection.targetConceptIds);
  const startTopic = [...graph.topics]
    .filter((topic) => topic.conceptIds.some((concept) => targets.has(concept.conceptId)))
    .sort((a, b) => a.defaultOrder - b.defaultOrder)[0];
  if (!startTopic) {
    return {
      branch: "out_of_library",
      graphId: "",
      params: result.params,
      freeformTopic: input.query.trim(),
      diagnostics: result.diagnostics,
    };
  }

  return {
    ...result,
    learningGoal: input.query.trim(),
    ...buildLinearPath(
      result.graphId,
      startTopic.topicId,
      selection.targetConceptIds[0] ?? null,
      language,
      selection.targetConceptIds,
    ),
  };
}

function seedGoalScopedResult(
  graphId: string,
  base: PositioningResult,
  language: KgLanguage,
): PositioningResult {
  const root = [...getTopicGraph(graphId).topics].sort((a, b) => a.defaultOrder - b.defaultOrder)[0];
  if (!root) return base;
  return {
    branch: "positioned",
    graphId,
    params: base.params,
    mode: "goal_scoped",
    diagnostics: base.diagnostics,
    ...buildLinearPath(graphId, root.topicId, null, language, []),
  };
}

export async function positionLearningGoal(
  input: PositionLearningGoalInput,
  deps: PositionLearningGoalDeps = {},
): Promise<PositionLearningGoalResult> {
  const overrides: Partial<PositioningParams> = {};
  if (input.floor !== undefined) overrides.floor = input.floor;
  const params = resolvePositioningParams(overrides);
  const language: "zh" | "en" = input.language?.toLowerCase().startsWith("zh")
    ? "zh"
    : input.language
      ? "en"
      : detectKgLanguage(input.query);
  const allLibrarySubjects = listLibrarySubjects();
  const explicitlyNamedGraphIds = findExplicitSubjectGraphIds(input.query);
  const explicitlyPrimaryGraphId = findPrimarySubjectGraphId(input.query);
  const deterministicGoal = classifyDeterministicGoal(input.query);
  if (deterministicGoal?.kind === "out_of_library") {
    return {
      result: {
        branch: "out_of_library",
        graphId: "",
        params,
        freeformTopic: deterministicGoal.topic,
        diagnostics: buildDiagnostics(0, []),
      },
      search: makeEmptyKnowledgeGraphSearchResponse(input),
    };
  }
  const curriculumRoute = resolveCurriculumRoute({
    query: input.query,
    learnerContext: input.curriculumContext,
    selectedGraphId:
      input.graphId ?? explicitlyPrimaryGraphId ?? (explicitlyNamedGraphIds.length === 1 ? explicitlyNamedGraphIds[0] : undefined),
  });

  if (curriculumRoute.kind === "clarify") {
    const candidates = curriculumRoute.graphIds.map((graphId) => ({
      graphId,
      subject: getKnowledgeGraphSubjectLabel(graphId, language),
      bestSimilarity: 1,
    }));
    const diagnostics = buildDiagnostics(0, candidates);
    return {
      result: safeDefault({
        candidates,
        librarySubjects: allLibrarySubjects,
        hitTopicIdsByGraph: new Map(),
        language,
        diagnostics,
        params,
      }),
      search: makeEmptyKnowledgeGraphSearchResponse(input),
    };
  }

  if (curriculumRoute.kind === "uncovered") {
    const curriculum = curriculumRoute.context.system
      ? CURRICULUM_SYSTEM_LABELS[curriculumRoute.context.system]
      : "the confirmed curriculum";
    return {
      result: {
        branch: "out_of_library",
        graphId: "",
        params,
        freeformTopic: `${input.query.trim()} (${curriculum})`,
        diagnostics: buildDiagnostics(0, []),
      },
      search: makeEmptyKnowledgeGraphSearchResponse(input),
    };
  }

  const enforcedGraphIds = input.graphId
    ? [input.graphId]
    : curriculumRoute.kind === "restricted"
      ? curriculumRoute.graphIds
      : null;

  if (!enforcedGraphIds) {
    const deterministic = deterministicGoal;
    if (deterministic?.kind === "fallback") {
      const diagnostics = buildDiagnostics(0, []);
      return {
        result: safeDefault({
          candidates: [],
          librarySubjects: allLibrarySubjects,
          hitTopicIdsByGraph: new Map(),
          language,
          diagnostics,
          params,
        }),
        search: makeEmptyKnowledgeGraphSearchResponse(input),
      };
    }
    if (deterministic?.kind === "clarify") {
      const candidates = deterministic.candidateGraphIds.map((graphId) => ({
        graphId,
        subject: getKnowledgeGraphSubjectLabel(graphId, language),
        bestSimilarity: 1,
      }));
      const diagnostics = buildDiagnostics(1, candidates);
      return {
        result: safeDefault({
          candidates,
          librarySubjects: allLibrarySubjects,
          hitTopicIdsByGraph: new Map(),
          language,
          diagnostics,
          params,
        }),
        search: makeEmptyKnowledgeGraphSearchResponse(input),
      };
    }
    if (deterministic?.kind === "positioned") {
      const topic = getTopicGraph(deterministic.graphId).topics.find(
        (candidate) => candidate.topicId === deterministic.startTopicId,
      );
      if (topic) {
        const targetConceptIds = deterministic.targetConceptIds ?? topic.conceptIds.map((concept) => concept.conceptId);
        const diagnostics = buildDiagnostics(1, [{
          graphId: deterministic.graphId,
          subject: getKnowledgeGraphSubjectLabel(deterministic.graphId, language),
          bestSimilarity: 1,
        }]);
        return {
          result: {
            branch: "positioned",
            graphId: deterministic.graphId,
            params,
            mode: deterministic.mode,
            diagnostics,
            learningGoal: deterministic.mode === "goal_scoped" ? input.query.trim() : undefined,
            ...buildLinearPath(
              deterministic.graphId,
              deterministic.startTopicId,
              null,
              language,
              targetConceptIds,
            ),
          },
          search: makeEmptyKnowledgeGraphSearchResponse({ ...input, graphId: deterministic.graphId }),
        };
      }
    }
  }

  const namedAnchorGraphIds = enforcedGraphIds ?? (explicitlyPrimaryGraphId ? [explicitlyPrimaryGraphId] : explicitlyNamedGraphIds);
  if (namedAnchorGraphIds.length === 1) {
    const anchor = findExactNamedGoalAnchor(input.query, namedAnchorGraphIds);
    if (anchor) {
      const topic = getTopicGraph(anchor.graphId).topics.find((candidate) => candidate.topicId === anchor.topicId)!;
      const targetConceptId = anchor.kind === "concept" ? anchor.conceptId : null;
      const targetConceptIds = anchor.kind === "concept"
        ? [anchor.conceptId]
        : topic.conceptIds.map((concept) => concept.conceptId);
      const diagnostics = buildDiagnostics(1, [{
        graphId: anchor.graphId,
        subject: getKnowledgeGraphSubjectLabel(anchor.graphId, language),
        bestSimilarity: 1,
      }]);
      return {
        result: {
          branch: "positioned",
          graphId: anchor.graphId,
          params,
          mode: anchor.kind === "concept" ? "specific" : "directed",
          diagnostics,
          ...buildLinearPath(anchor.graphId, anchor.topicId, targetConceptId, language, targetConceptIds),
        },
        search: makeEmptyKnowledgeGraphSearchResponse({ ...input, graphId: anchor.graphId }),
      };
    }
  }
  const searchInput = enforcedGraphIds?.length === 1
    ? { ...input, graphId: enforcedGraphIds[0] }
    : input;

  // Distinguish KG coverage miss from KG infrastructure failure. A broken KG
  // (missing table, dead DB, dead embedding provider) must fail loudly instead
  // of silently rerouting every goal into the freeform gate / gen_* graphs.
  // Only kg_schema_missing may degrade, and only behind the explicit dev flag.
  let search: KnowledgeGraphSearchResponse;
  try {
    search = await (deps.searchKnowledgeGraphNodes ?? searchKnowledgeGraphNodes)(searchInput);
  } catch (error) {
    const kind = classifyKnowledgeGraphFailure(error);
    if (kind === "kg_schema_missing" && allowKgInfraFallback()) {
      console.warn("[kg] degraded fallback enabled: kg_schema_missing -> freeform gate", error);
      search = makeEmptyKnowledgeGraphSearchResponse(searchInput);
    } else {
      throw new KnowledgeGraphUnavailableError(kind, error);
    }
  }
  if (enforcedGraphIds && enforcedGraphIds.length > 1) {
    const allowed = new Set(enforcedGraphIds);
    search = { ...search, results: search.results.filter((result) => allowed.has(result.graphId)) };
  }
  const librarySubjects = enforcedGraphIds
    ? allLibrarySubjects.filter((subject) => enforcedGraphIds.includes(subject.graphId))
    : allLibrarySubjects;

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
      failOnModelError: deps.failOnModelError,
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

  const allowedGraphIds = enforcedGraphIds ? new Set(enforcedGraphIds) : null;
  const candidates = buildGraphCandidates(search.results, undefined, search.encodedQuery.coreQuery)
    .filter((candidate) => !allowedGraphIds || allowedGraphIds.has(candidate.graphId))
    .map(
      (c): GraphCandidateLite => ({ graphId: c.graphId, subject: c.subject, bestSimilarity: c.bestSimilarity }),
    );
  const explicitGraphIds = explicitlyNamedGraphIds.filter(
    (graphId) => !enforcedGraphIds || enforcedGraphIds.includes(graphId),
  );
  const inferredPrimarySubjectGraphId = explicitlyPrimaryGraphId;
  const primarySubjectGraphId = enforcedGraphIds?.length === 1
    ? enforcedGraphIds[0]
    : inferredPrimarySubjectGraphId && (!enforcedGraphIds || enforcedGraphIds.includes(inferredPrimarySubjectGraphId))
      ? inferredPrimarySubjectGraphId
      : null;

  // Margin: if the top subject clearly dominates, position inside it alone;
  // otherwise hand the top-N graphs to Stage 2 to pick + position in one call.
  const dominates =
    candidates.length <= 1 ||
    candidates[0].bestSimilarity - candidates[1].bestSimilarity >= params.marginWindow;
  const recalled = dominates ? candidates.slice(0, 1) : candidates.slice(0, params.maxStage2Graphs);
  const librarySubjectById = new Map(librarySubjects.map((subject) => [subject.graphId, subject]));
  const explicit = explicitGraphIds
    .map((graphId) => librarySubjectById.get(graphId))
    .filter((subject): subject is { graphId: string; subject: string } => Boolean(subject))
    .map((subject) => ({ ...subject, bestSimilarity: 1 }));
  const selected = [...explicit, ...recalled.filter((candidate) => !explicitGraphIds.includes(candidate.graphId))].slice(
    0,
    params.maxStage2Graphs,
  );

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
      failOnModelError: deps.failOnModelError,
    },
    undefined,
  );
  let result = decision ? finalizeStage2(decision, ctx) : safeDefault(ctx);
  if (hasGoalScopeModifier(input.query) && primarySubjectGraphId) {
    result = seedGoalScopedResult(primarySubjectGraphId, result, language);
  } else if (
    hasCompositionConnector(input.query) &&
    explicitGraphIds.length === 0 &&
    (result.branch === "positioned" || result.branch === "clarify_subject")
  ) {
    const graphId = result.branch === "positioned" ? result.graphId : selected[0]?.graphId;
    if (graphId) result = seedGoalScopedResult(graphId, result, language);
  }
  const deterministicTargetConceptIds = primarySubjectGraphId
    ? selectDeterministicGoalTargets(
        primarySubjectGraphId,
        explicitGraphIds.filter((graphId) => graphId !== primarySubjectGraphId),
      )
    : [];
  result = await resolveGoalScopedResult(
    result,
    input,
    language,
    deps,
    deterministicTargetConceptIds,
  );
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
      targetConceptIds: result.targetConceptIds ?? (result.targetConceptId ? [result.targetConceptId] : []),
      scope: result.mode === "goal_scoped" ? "goal" : "canonical",
      learningGoal: result.learningGoal ?? null,
      nextTopic: next ? { topicId: next.topicId, name: next.name, concepts: next.concepts } : null,
    },
  };
}
