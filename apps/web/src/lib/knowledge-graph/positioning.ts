import { getTopic, getTopicGraph, nextTopic, type TopicConcept } from "./topic-graph";
import { type KgLanguage, localizeConcepts, resolveKgDisplayName } from "./display-name";

// Cold-start entry positioning (route B, block 4).
//
// Recall (search.ts) narrows a learner goal to a few candidate subject graphs.
// A single retrieval-grounded LLM call (positioning-llm.ts) then both picks the
// subject and positions inside it, emitting one of three outcomes:
//   - positioned: build a linear course from a start topic. `mode` records how
//     the start was chosen — specific (one concept targeted), subject_start (bare
//     subject → graph root), or directed (sub-area/level/review intent → upstream
//     of the hit region).
//   - clarify_subject: several subjects are plausible and none dominates → return
//     a warm message + clickable subject chips for the learner to pick.
//   - fallback: nothing relevant in the library → ask for a more specific goal.
//
// This module holds the pure, LLM-free pieces: params, the linear-path builder,
// and the validation/guardrail layer (`finalizeStage2`) that turns the model's
// untrusted decision into a grounded result. It is unit-testable without a model.

export const DEFAULT_KG_POSITION_FLOOR = 0.28; // fallback if max similarity < FLOOR
export const DEFAULT_KG_GRAPH_MARGIN_WINDOW = 0.06; // single graph if best-2nd >= window
export const DEFAULT_KG_MAX_STAGE2_GRAPHS = 3;

export type PositioningParams = {
  floor: number;
  marginWindow: number;
  maxStage2Graphs: number;
};

export type PositioningMode = "specific" | "subject_start" | "directed" | "goal_scoped";
export type PositioningBranch = "positioned" | "clarify_subject" | "fallback" | "out_of_library";

export type LessonPlan = {
  order: number;
  topicId: string;
  name: string;
  concepts: TopicConcept[];
};

export type SubjectCandidate = {
  graphId: string;
  subject: string;
  startTopicId: string;
};

export type PositioningDiagnostics = {
  maxSimilarity: number;
  candidateGraphs: Array<{ graphId: string; bestSimilarity: number }>;
};

export type PositioningResult = {
  branch: PositioningBranch;
  graphId: string;
  params: PositioningParams;
  // positioned
  mode?: PositioningMode;
  startTopicId?: string;
  targetConceptId?: string | null;
  targetConceptIds?: string[];
  learningGoal?: string;
  linear?: boolean;
  path?: LessonPlan[];
  // clarify_subject
  candidates?: SubjectCandidate[];
  // clarify_subject / fallback / out_of_library
  message?: string;
  // out_of_library: concise course topic for free-form generation.
  freeformTopic?: string;
  diagnostics: PositioningDiagnostics;
};

// Untrusted decision shape returned by the Stage-2 LLM. Everything here is
// validated by finalizeStage2 before it reaches a caller.
export type Stage2Decision =
  | {
      outcome: "positioned";
      graphId: string;
      mode: PositioningMode;
      startTopicId: string;
      targetConceptId?: string | null;
      targetConceptIds?: string[];
      reason?: string;
    }
  | { outcome: "clarify_subject"; message?: string; candidateGraphIds: string[] }
  | { outcome: "out_of_library"; topic?: string; message?: string }
  | { outcome: "fallback"; message?: string };

// Lean candidate view finalizeStage2 needs (decoupled from graph-router's
// GraphCandidate so positioning.ts stays free of recall/router imports).
export type GraphCandidateLite = { graphId: string; subject: string; bestSimilarity: number };

export type LibrarySubject = { graphId: string; subject: string };

export type FinalizeContext = {
  candidates: GraphCandidateLite[];
  // Every subject in the library (not just recall candidates). Lets Stage 2
  // route to a subject that embedding recall pruned, and validates its picks.
  librarySubjects: LibrarySubject[];
  // recall-hit topic ids per graph, for the directed guardrail.
  hitTopicIdsByGraph: Map<string, Set<string>>;
  language: KgLanguage;
  diagnostics: PositioningDiagnostics;
  params: PositioningParams;
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
    floor: overrides.floor ?? env("KG_POSITION_FLOOR", DEFAULT_KG_POSITION_FLOOR),
    marginWindow: overrides.marginWindow ?? env("KG_GRAPH_MARGIN_WINDOW", DEFAULT_KG_GRAPH_MARGIN_WINDOW),
    maxStage2Graphs:
      overrides.maxStage2Graphs ?? Math.trunc(env("KG_MAX_STAGE2_GRAPHS", DEFAULT_KG_MAX_STAGE2_GRAPHS)),
  };
}

function firstTopicOf(graphId: string) {
  const graph = getTopicGraph(graphId);
  return [...graph.topics].sort((a, b) => a.defaultOrder - b.defaultOrder)[0];
}

function earliestHitOrder(graphId: string, hitTopicIds: Set<string> | undefined): number {
  if (!hitTopicIds || hitTopicIds.size === 0) return Number.POSITIVE_INFINITY;
  const graph = getTopicGraph(graphId);
  let min = Number.POSITIVE_INFINITY;
  for (const topic of graph.topics) {
    if (hitTopicIds.has(topic.topicId) && topic.defaultOrder < min) min = topic.defaultOrder;
  }
  return min;
}

export function buildLinearPath(
  graphId: string,
  startTopicId: string,
  targetConceptId: string | null,
  language: KgLanguage,
  targetConceptIds: string[] = targetConceptId ? [targetConceptId] : [],
): {
  startTopicId: string;
  targetConceptId: string | null;
  targetConceptIds: string[];
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
  return { startTopicId, targetConceptId, targetConceptIds, linear: path.length > 1, path };
}

function subjectChips(list: LibrarySubject[]): SubjectCandidate[] {
  const out: SubjectCandidate[] = [];
  for (const c of list) {
    const root = firstTopicOf(c.graphId);
    if (root) out.push({ graphId: c.graphId, subject: c.subject, startTopicId: root.topicId });
  }
  return out;
}

function subjectCandidateList(ctx: FinalizeContext): SubjectCandidate[] {
  return subjectChips(ctx.candidates);
}

// Safe default when the LLM errors / times out / returns nothing usable. With a
// single candidate subject, start it from its root; with several plausible
// subjects, never guess — ask the learner to pick (clarify_subject) instead of
// silently building a course in the wrong subject.
export function safeDefault(ctx: FinalizeContext): PositioningResult {
  const top = ctx.candidates[0];
  if (!top) {
    return { branch: "fallback", graphId: "", params: ctx.params, message: FALLBACK_MESSAGE, diagnostics: ctx.diagnostics };
  }
  if (ctx.candidates.length >= 2) {
    const candidates = subjectCandidateList(ctx);
    if (candidates.length >= 2) {
      return {
        branch: "clarify_subject",
        graphId: candidates[0].graphId,
        params: ctx.params,
        candidates,
        message: defaultClarifyMessage(candidates, ctx.language),
        diagnostics: ctx.diagnostics,
      };
    }
  }
  const root = firstTopicOf(top.graphId);
  if (!root) {
    return { branch: "fallback", graphId: "", params: ctx.params, message: FALLBACK_MESSAGE, diagnostics: ctx.diagnostics };
  }
  return {
    branch: "positioned",
    graphId: top.graphId,
    params: ctx.params,
    mode: "subject_start",
    diagnostics: ctx.diagnostics,
    ...buildLinearPath(top.graphId, root.topicId, null, ctx.language),
  };
}

// Pure validation + guardrails. Turns the model's untrusted Stage2Decision into a
// grounded PositioningResult; coerces anything invalid to a safe outcome.
export function finalizeStage2(decision: Stage2Decision | null, ctx: FinalizeContext): PositioningResult {
  if (!decision) return safeDefault(ctx);
  const validGraphIds = new Set(ctx.candidates.map((c) => c.graphId));

  if (decision.outcome === "fallback") {
    return {
      branch: "fallback",
      graphId: ctx.candidates[0]?.graphId ?? "",
      params: ctx.params,
      message: decision.message?.trim() || FALLBACK_MESSAGE,
      diagnostics: ctx.diagnostics,
    };
  }

  if (decision.outcome === "out_of_library") {
    return {
      branch: "out_of_library",
      graphId: "",
      params: ctx.params,
      freeformTopic: decision.topic?.trim() || undefined,
      message: decision.message?.trim() || undefined,
      diagnostics: ctx.diagnostics,
    };
  }

  if (decision.outcome === "clarify_subject") {
    // Chips may reference any library subject, not just recall candidates.
    const subjectById = new Map(ctx.librarySubjects.map((s) => [s.graphId, s.subject]));
    for (const c of ctx.candidates) subjectById.set(c.graphId, c.subject);
    const requested = decision.candidateGraphIds.filter((id) => subjectById.has(id));
    const base: LibrarySubject[] =
      requested.length > 0
        ? [...new Set(requested)].map((graphId) => ({ graphId, subject: subjectById.get(graphId)! }))
        : ctx.candidates;
    const candidates = subjectChips(base);
    if (candidates.length < 2) return safeDefault(ctx); // nothing to choose between
    const message = decision.message?.trim() || defaultClarifyMessage(candidates, ctx.language);
    return {
      branch: "clarify_subject",
      graphId: candidates[0].graphId,
      params: ctx.params,
      candidates,
      message,
      diagnostics: ctx.diagnostics,
    };
  }

  // positioned
  const inCandidates = validGraphIds.has(decision.graphId);
  const inLibrary = inCandidates || ctx.librarySubjects.some((s) => s.graphId === decision.graphId);
  if (!inLibrary) return safeDefault(ctx);
  const graphId = decision.graphId;
  const root = firstTopicOf(graphId);
  if (!root) return safeDefault(ctx);

  // Stage 2 saw full topic lists only for recall candidates; a pick from the
  // wider library list can only start the subject from its root.
  let mode: PositioningMode = inCandidates || decision.mode === "goal_scoped" ? decision.mode : "subject_start";
  let startTopicId = decision.startTopicId;
  let targetConceptId: string | null = decision.targetConceptId ?? null;
  let targetConceptIds = decision.targetConceptIds ?? [];

  const startTopic = getTopic(graphId, startTopicId);
  if (!startTopic) {
    // A goal-scoped library pick may come from the subject-only list, where the
    // model was instructed to emit "root". Keep the mode so the bounded scope
    // selector can resolve real concept ids in a second grounded call.
    if (mode !== "goal_scoped") mode = "subject_start";
    startTopicId = root.topicId;
  }

  if (mode === "subject_start") {
    startTopicId = root.topicId;
    targetConceptId = null;
    targetConceptIds = [];
  } else if (mode === "directed") {
    const topic = getTopic(graphId, startTopicId)!;
    const hitTopicIds = ctx.hitTopicIdsByGraph.get(graphId);
    const earliest = earliestHitOrder(graphId, hitTopicIds);
    const selectedTopicWasHit = hitTopicIds?.has(topic.topicId) ?? false;
    // Directed must move past the root and must not skip ahead of the hit region.
    // A selected topic that was itself recalled remains valid even if another
    // noisy retrieval hit happens to have an earlier authored order.
    if (topic.defaultOrder <= root.defaultOrder || (!selectedTopicWasHit && topic.defaultOrder > earliest)) {
      mode = "subject_start";
      startTopicId = root.topicId;
    }
    targetConceptId = null;
    const hitTopic =
      mode === "directed"
        ? selectedTopicWasHit
          ? topic
          : [...getTopicGraph(graphId).topics]
              .filter((candidate) => hitTopicIds?.has(candidate.topicId))
              .sort((a, b) => a.defaultOrder - b.defaultOrder)[0]
        : null;
    targetConceptIds = hitTopic?.conceptIds.map((concept) => concept.conceptId) ?? [];
  } else if (mode === "goal_scoped") {
    const validConceptIds = new Set(getTopicGraph(graphId).topics.flatMap((topic) => topic.conceptIds.map((c) => c.conceptId)));
    targetConceptIds = [...new Set(targetConceptIds.filter((id) => validConceptIds.has(id)))];
    targetConceptId = targetConceptIds[0] ?? null;
  } else {
    // specific: keep targetConceptId only if it belongs to the start topic.
    const topic = getTopic(graphId, startTopicId)!;
    const owns = targetConceptId !== null && topic.conceptIds.some((c) => c.conceptId === targetConceptId);
    if (owns && targetConceptId) {
      targetConceptIds = [targetConceptId];
    } else {
      // A model may correctly identify the topic but omit or mistype the
      // concept id. Preserve the bounded topic scope instead of expanding from
      // this topic through the remainder of the authored graph.
      mode = "directed";
      targetConceptId = null;
      targetConceptIds = topic.conceptIds.map((concept) => concept.conceptId);
    }
  }

  return {
    branch: "positioned",
    graphId,
    params: ctx.params,
    mode,
    diagnostics: ctx.diagnostics,
    ...buildLinearPath(graphId, startTopicId, targetConceptId, ctx.language, targetConceptIds),
  };
}

function defaultClarifyMessage(candidates: SubjectCandidate[], language?: string | null): string {
  const names = candidates.map((c) => c.subject).join(" / ");
  return language?.startsWith("zh")
    ? `这个方向有几个学科都沾边，你想从哪个开始？\n${names}`
    : `A few subjects match your goal. Pick where to start:\n${names}`;
}
