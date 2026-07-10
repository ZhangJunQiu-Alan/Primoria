#!/usr/bin/env tsx

import {
  finalizeStage2,
  resolvePositioningParams,
  safeDefault,
  type FinalizeContext,
  type GraphCandidateLite,
  type Stage2Decision,
} from "../src/lib/knowledge-graph/positioning.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

// Real graphs (generated KG artifact). linear_algebra: topic1 order1, topic4 order4.
const LA = "linear_algebra";
const CALC = "mit_calculus";
const LA_T1 = "t_mit1806_linear_equations"; // order 1 (root)
const LA_T3 = "t_mit1806_vector_spaces"; // order 3
const LA_T4 = "t_mit1806_vector_spaces_mit1806_independence_basis"; // order 4
const LA_C1 = "c_mit1806_vectors"; // belongs to LA_T1
const LA_C_OTHER = "c_mit1806_spaces_subspaces"; // belongs to LA_T3, not LA_T1

function ctx(opts: {
  candidates?: GraphCandidateLite[];
  hits?: Record<string, string[]>;
} = {}): FinalizeContext {
  const candidates = opts.candidates ?? [
    { graphId: LA, subject: "Linear Algebra", bestSimilarity: 0.7 },
    { graphId: CALC, subject: "Calculus", bestSimilarity: 0.66 },
  ];
  const hitTopicIdsByGraph = new Map<string, Set<string>>();
  for (const [g, ids] of Object.entries(opts.hits ?? {})) hitTopicIdsByGraph.set(g, new Set(ids));
  return {
    candidates,
    librarySubjects: [
      { graphId: LA, subject: "Linear Algebra" },
      { graphId: CALC, subject: "Calculus" },
      { graphId: "python_fundamentals", subject: "Python Fundamentals" },
    ],
    hitTopicIdsByGraph,
    language: "en",
    diagnostics: { maxSimilarity: candidates[0]?.bestSimilarity ?? 0, candidateGraphs: [] },
    params: resolvePositioningParams(),
  };
}

function positioned(over: Partial<Extract<Stage2Decision, { outcome: "positioned" }>>): Stage2Decision {
  return { outcome: "positioned", graphId: LA, mode: "subject_start", startTopicId: LA_T1, ...over };
}

function main() {
  // subject_start forces root topic + null concept, even if model named a later topic.
  {
    const r = finalizeStage2(positioned({ mode: "subject_start", startTopicId: LA_T3, targetConceptId: LA_C_OTHER }), ctx());
    assert(r.branch === "positioned" && r.mode === "subject_start", "subject_start stays positioned");
    assert(r.startTopicId === LA_T1, "subject_start coerced to root topic");
    assert(r.targetConceptId === null, "subject_start clears concept");
  }

  // directed kept when within (root, earliest-hit].
  {
    const r = finalizeStage2(positioned({ mode: "directed", startTopicId: LA_T3 }), ctx({ hits: { [LA]: [LA_T3, LA_T4] } }));
    assert(r.mode === "directed" && r.startTopicId === LA_T3, "directed kept at upstream of hit region");
    assert(r.targetConceptId === null, "directed clears concept");
  }

  // directed coerced to subject_start when it would skip past the earliest hit.
  {
    const r = finalizeStage2(positioned({ mode: "directed", startTopicId: LA_T4 }), ctx({ hits: { [LA]: [LA_T3] } }));
    assert(r.mode === "subject_start" && r.startTopicId === LA_T1, "directed past hit region → subject_start");
  }

  // directed coerced when it equals the root (no real direction).
  {
    const r = finalizeStage2(positioned({ mode: "directed", startTopicId: LA_T1 }), ctx({ hits: { [LA]: [LA_T1] } }));
    assert(r.mode === "subject_start", "directed at root → subject_start");
  }

  // specific keeps a concept that belongs to the start topic.
  {
    const r = finalizeStage2(positioned({ mode: "specific", startTopicId: LA_T1, targetConceptId: LA_C1 }), ctx());
    assert(r.mode === "specific" && r.targetConceptId === LA_C1, "specific keeps owned concept");
  }

  // specific drops a concept owned by a different topic.
  {
    const r = finalizeStage2(positioned({ mode: "specific", startTopicId: LA_T1, targetConceptId: LA_C_OTHER }), ctx());
    assert(r.mode === "specific" && r.targetConceptId === null, "specific drops foreign concept");
  }

  // hallucinated topic id → degrade to subject_start at root.
  {
    const r = finalizeStage2(positioned({ mode: "specific", startTopicId: "t_does_not_exist" }), ctx());
    assert(r.mode === "subject_start" && r.startTopicId === LA_T1, "bad topic id → subject_start root");
  }

  // graphId in the library but not among candidates → positioned at that
  // subject's root (Stage 2 may route past embedding-pruned candidates).
  {
    const r = finalizeStage2(positioned({ graphId: "python_fundamentals", startTopicId: "root" }), ctx());
    assert(r.branch === "positioned" && r.graphId === "python_fundamentals" && r.mode === "subject_start", "library graph outside candidates → subject_start");
    assert(typeof r.startTopicId === "string" && r.startTopicId !== "root", "library-pick start coerced to real root topic");
  }

  // graphId not in the library at all → safe default (clarify with 2 candidates).
  {
    const r = finalizeStage2(positioned({ graphId: "not_a_graph", startTopicId: LA_T1 }), ctx());
    assert(r.branch === "clarify_subject", "unknown graph → safeDefault clarify");
  }

  // clarify_subject → two subject chips, each starting at its root topic.
  {
    const d: Stage2Decision = { outcome: "clarify_subject", candidateGraphIds: [LA, CALC], message: "" };
    const r = finalizeStage2(d, ctx());
    assert(r.branch === "clarify_subject" && r.candidates?.length === 2, "clarify yields candidates");
    assert(r.candidates!.find((c) => c.graphId === LA)?.startTopicId === LA_T1, "clarify candidate starts at root");
    assert((r.message ?? "").length > 0, "clarify has a message");
  }

  // clarify with fewer than 2 valid candidates → safe default (nothing to choose).
  {
    const d: Stage2Decision = { outcome: "clarify_subject", candidateGraphIds: [LA], message: "x" };
    const r = finalizeStage2(d, ctx({ candidates: [{ graphId: LA, subject: "Linear Algebra", bestSimilarity: 0.7 }] }));
    assert(r.branch === "positioned", "single-subject clarify collapses to positioned");
  }

  // fallback decision passes through its message.
  {
    const r = finalizeStage2({ outcome: "fallback", message: "be more specific" }, ctx());
    assert(r.branch === "fallback" && r.message === "be more specific", "fallback message kept");
  }

  // null decision (LLM failure) with several candidates → clarify, never a
  // silently-guessed course.
  {
    const r = finalizeStage2(null, ctx());
    assert(r.branch === "clarify_subject" && (r.candidates?.length ?? 0) === 2, "null + 2 candidates → clarify");
    assert((r.message ?? "").length > 0, "degraded clarify has a message");
  }

  // null decision with a single dominating candidate → subject_start at its root.
  {
    const r = finalizeStage2(null, ctx({ candidates: [{ graphId: LA, subject: "Linear Algebra", bestSimilarity: 0.7 }] }));
    assert(r.branch === "positioned" && r.mode === "subject_start" && r.graphId === LA, "null + 1 candidate → safeDefault positioned");
  }

  // out_of_library decision passes topic + message through.
  {
    const r = finalizeStage2({ outcome: "out_of_library", topic: "MCP 协议", message: "为你定制课程" }, ctx());
    assert(r.branch === "out_of_library" && r.freeformTopic === "MCP 协议" && r.message === "为你定制课程", "out_of_library passthrough");
  }

  // clarify may offer library subjects beyond the recall candidates.
  {
    const d: Stage2Decision = { outcome: "clarify_subject", candidateGraphIds: [LA, "python_fundamentals"], message: "" };
    const r = finalizeStage2(d, ctx());
    assert(r.branch === "clarify_subject" && r.candidates?.some((c) => c.graphId === "python_fundamentals"), "clarify includes library subject");
  }

  // safe default with no candidates → fallback.
  {
    const r = safeDefault(ctx({ candidates: [] }));
    assert(r.branch === "fallback", "no candidates → fallback");
  }

  console.log("positioning.unit: all assertions passed");
}

main();
