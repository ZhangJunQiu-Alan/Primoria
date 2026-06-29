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

export type PositioningMode = "specific" | "subject_start" | "directed";
export type PositioningBranch = "positioned" | "clarify_subject" | "fallback";

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
  linear?: boolean;
  path?: LessonPlan[];
  // clarify_subject
  candidates?: SubjectCandidate[];
  // clarify_subject / fallback
  message?: string;
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
      reason?: string;
    }
  | { outcome: "clarify_subject"; message?: string; candidateGraphIds: string[] }
  | { outcome: "fallback"; message?: string };

// Lean candidate view finalizeStage2 needs (decoupled from graph-router's
// GraphCandidate so positioning.ts stays free of recall/router imports).
export type GraphCandidateLite = { graphId: string; subject: string; bestSimilarity: number };

export type FinalizeContext = {
  candidates: GraphCandidateLite[];
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

function subjectCandidateList(ctx: FinalizeContext): SubjectCandidate[] {
  const out: SubjectCandidate[] = [];
  for (const c of ctx.candidates) {
    const root = firstTopicOf(c.graphId);
    if (root) out.push({ graphId: c.graphId, subject: c.subject, startTopicId: root.topicId });
  }
  return out;
}

// Safe default when the LLM errors / times out / returns nothing usable: start
// the top candidate subject from its root. Never blocks the learner.
export function safeDefault(ctx: FinalizeContext): PositioningResult {
  const top = ctx.candidates[0];
  if (!top) {
    return { branch: "fallback", graphId: "", params: ctx.params, message: FALLBACK_MESSAGE, diagnostics: ctx.diagnostics };
  }
  const root = firstTopicOf(top.graphId);
  return {
    branch: "positioned",
    graphId: top.graphId,
    params: ctx.params,
    mode: "subject_start",
    diagnostics: ctx.diagnostics,
    ...buildLinearPath(top.graphId, root!.topicId, null, ctx.language),
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

  if (decision.outcome === "clarify_subject") {
    const all = subjectCandidateList(ctx);
    const requested = new Set(decision.candidateGraphIds.filter((id) => validGraphIds.has(id)));
    const candidates = requested.size > 0 ? all.filter((c) => requested.has(c.graphId)) : all;
    if (candidates.length < 2) return safeDefault(ctx); // nothing to choose between
    const message = decision.message?.trim() || defaultClarifyMessage(candidates);
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
  if (!validGraphIds.has(decision.graphId)) return safeDefault(ctx);
  const graphId = decision.graphId;
  const root = firstTopicOf(graphId);
  if (!root) return safeDefault(ctx);

  let mode: PositioningMode = decision.mode;
  let startTopicId = decision.startTopicId;
  let targetConceptId: string | null = decision.targetConceptId ?? null;

  const startTopic = getTopic(graphId, startTopicId);
  if (!startTopic) {
    // hallucinated topic id → degrade to subject_start at root.
    mode = "subject_start";
    startTopicId = root.topicId;
  }

  if (mode === "subject_start") {
    startTopicId = root.topicId;
    targetConceptId = null;
  } else if (mode === "directed") {
    const topic = getTopic(graphId, startTopicId)!;
    const earliest = earliestHitOrder(graphId, ctx.hitTopicIdsByGraph.get(graphId));
    // Directed must move past the root and must not skip ahead of the hit region.
    if (topic.defaultOrder <= root.defaultOrder || topic.defaultOrder > earliest) {
      mode = "subject_start";
      startTopicId = root.topicId;
    }
    targetConceptId = null;
  } else {
    // specific: keep targetConceptId only if it belongs to the start topic.
    const topic = getTopic(graphId, startTopicId)!;
    const owns = targetConceptId && topic.conceptIds.some((c) => c.conceptId === targetConceptId);
    targetConceptId = owns ? targetConceptId : null;
  }

  return {
    branch: "positioned",
    graphId,
    params: ctx.params,
    mode,
    diagnostics: ctx.diagnostics,
    ...buildLinearPath(graphId, startTopicId, targetConceptId, ctx.language),
  };
}

function defaultClarifyMessage(candidates: SubjectCandidate[]): string {
  const names = candidates.map((c) => c.subject).join(" / ");
  return `这个方向有几个学科都沾边,你想从哪个开始?\n${names}`;
}
