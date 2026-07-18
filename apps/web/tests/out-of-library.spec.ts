import { describe, expect, it, vi } from "vitest";

import { runStage2Positioning, type Stage2Graph } from "../src/lib/knowledge-graph/positioning-llm";
import { planFromPositioning, positionLearningGoal } from "../src/lib/knowledge-graph/position-learning-goal";
import { resolvePositioningParams, type PositioningResult } from "../src/lib/knowledge-graph/positioning";
import {
  normalizeTopicKey,
  parseGeneratedGraph,
  toTopicGraph,
} from "../src/lib/knowledge-graph/generated-graph";
import { encodeKnowledgeGraphQuery } from "../src/lib/knowledge-graph/query-encoding";
import {
  ALL_KG_GRAPHS,
  type KnowledgeGraphSearchResponse,
  type KnowledgeGraphSearchResult,
} from "../src/lib/knowledge-graph/search";
import { isCodeEligibleLessonContext } from "../src/lib/ai/course-generation/code-eligibility";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";

const GRAPHS: Stage2Graph[] = [{ graphId: "artificial_intelligence", subject: "Introduction to Artificial Intelligence" }];
const LIBRARY: Stage2Graph[] = [
  ...GRAPHS,
  { graphId: "discrete_math_and_probability", subject: "Discrete Math and Probability Theory" },
];

function invokerReturning(json: unknown) {
  return async () => JSON.stringify(json);
}

function searchResponse(query: string, results: KnowledgeGraphSearchResult[] = []): KnowledgeGraphSearchResponse {
  return {
    encodedQuery: encodeKnowledgeGraphQuery(query),
    graphId: ALL_KG_GRAPHS,
    modelVersion: "test-model",
    topK: 15,
    results,
  };
}

function searchResult(patch: Partial<KnowledgeGraphSearchResult> = {}): KnowledgeGraphSearchResult {
  return {
    graphId: "artificial_intelligence",
    kind: "topic",
    nodeId: "t_ai_intro",
    name: "AI Intro",
    description: null,
    topicId: null,
    topicName: null,
    embedText: "AI Intro",
    modelVersion: "test-model",
    distance: 0.9,
    similarity: 0.1,
    ...patch,
  };
}

describe("stage-2 out_of_library decision", () => {
  it("parses an out_of_library outcome", async () => {
    const decision = await runStage2Positioning(
      { query: "我想学MCP", language: "zh", graphs: GRAPHS, librarySubjects: LIBRARY },
      invokerReturning({ outcome: "out_of_library", topic: "MCP 协议", message: "为你定制课程" }),
    );
    expect(decision).toEqual({ outcome: "out_of_library", topic: "MCP 协议", message: "为你定制课程" });
  });

  it("accepts positioned on a library subject outside the candidate set", async () => {
    const decision = await runStage2Positioning(
      { query: "discrete math", language: "en", graphs: GRAPHS, librarySubjects: LIBRARY },
      invokerReturning({
        outcome: "positioned",
        graphId: "discrete_math_and_probability",
        mode: "subject_start",
        startTopicId: "root",
      }),
    );
    expect(decision).toMatchObject({ outcome: "positioned", graphId: "discrete_math_and_probability" });
  });

  it("rejects positioned on a graph outside the whole library", async () => {
    const decision = await runStage2Positioning(
      { query: "x", language: "en", graphs: GRAPHS, librarySubjects: LIBRARY },
      invokerReturning({ outcome: "positioned", graphId: "made_up", mode: "subject_start", startTopicId: "root" }),
    );
    expect(decision).toBeNull();
  });
});

describe("planFromPositioning out_of_library", () => {
  it("maps the branch to a free-form plan", () => {
    const result: PositioningResult = {
      branch: "out_of_library",
      graphId: "",
      params: resolvePositioningParams(),
      freeformTopic: "Agent 架构",
      message: "为你定制课程",
      diagnostics: { maxSimilarity: 0.5, candidateGraphs: [] },
    };
    expect(planFromPositioning(result)).toEqual({
      branch: "out_of_library",
      topic: "Agent 架构",
      message: "为你定制课程",
    });
  });
});

describe("positionLearningGoal out-of-library orchestration", () => {
  it("routes an empty recall for a teachable topic through the freeform gate", async () => {
    const query = "MCP 和 Agent 架构";
    const searchKnowledgeGraphNodes = vi.fn(async () => searchResponse(query));
    const runStage2Positioning = vi.fn();
    const runFreeformGoalGate = vi.fn(async () => ({
      outcome: "out_of_library" as const,
      topic: "MCP 和 Agent 架构",
      message: "为你定制课程图谱",
    }));

    const { result } = await positionLearningGoal(
      { query, floor: 0.28 },
      { searchKnowledgeGraphNodes, runStage2Positioning, runFreeformGoalGate },
    );

    expect(result).toMatchObject({
      branch: "out_of_library",
      freeformTopic: "MCP 和 Agent 架构",
      message: "为你定制课程图谱",
    });
    expect(runFreeformGoalGate).toHaveBeenCalledWith(
      expect.objectContaining({ query, language: "zh", librarySubjects: expect.any(Array) }),
    );
    expect(runStage2Positioning).not.toHaveBeenCalled();
  });

  it("does not directly fallback when recall exists but is below the floor", async () => {
    const query = "WebGPU shader 入门";
    const searchKnowledgeGraphNodes = vi.fn(async () => searchResponse(query, [searchResult({ similarity: 0.12 })]));
    const runStage2Positioning = vi.fn();
    const runFreeformGoalGate = vi.fn(async () => ({
      outcome: "out_of_library" as const,
      topic: "WebGPU shader 入门",
      message: "为你定制课程图谱",
    }));

    const { result } = await positionLearningGoal(
      { query, floor: 0.28 },
      { searchKnowledgeGraphNodes, runStage2Positioning, runFreeformGoalGate },
    );

    expect(result.branch).toBe("out_of_library");
    expect(result.freeformTopic).toBe("WebGPU shader 入门");
    expect(runFreeformGoalGate).toHaveBeenCalledTimes(1);
    expect(runStage2Positioning).not.toHaveBeenCalled();
  });

  it("falls back when the freeform gate rejects or cannot classify the low-confidence goal", async () => {
    const query = "随便学点东西";
    const lowConfidenceSearch = vi.fn(async () => searchResponse(query, [searchResult({ similarity: 0.08 })]));
    const runStage2Positioning = vi.fn();

    const fallbackGate = vi.fn(async () => ({
      outcome: "fallback" as const,
      message: "请提供更具体的学习目标。",
    }));
    const fallbackResult = await positionLearningGoal(
      { query, floor: 0.28 },
      { searchKnowledgeGraphNodes: lowConfidenceSearch, runStage2Positioning, runFreeformGoalGate: fallbackGate },
    );
    expect(fallbackResult.result).toMatchObject({
      branch: "fallback",
      graphId: ALL_KG_GRAPHS,
      message: "请提供更具体的学习目标。",
    });

    const nullGate = vi.fn(async () => null);
    const nullResult = await positionLearningGoal(
      { query, floor: 0.28 },
      { searchKnowledgeGraphNodes: lowConfidenceSearch, runStage2Positioning, runFreeformGoalGate: nullGate },
    );
    expect(nullResult.result.branch).toBe("fallback");
    expect(nullResult.result.graphId).toBe(ALL_KG_GRAPHS);
    expect(runStage2Positioning).not.toHaveBeenCalled();
  });
});

describe("positionLearningGoal goal-scoped orchestration", () => {
  const query = "我想要学习面向深度学习的线性代数";
  const result = searchResult({
    graphId: "linear_algebra",
    kind: "concept",
    nodeId: "c_mit1806_matrix_ops",
    name: "Matrix Operations and Inverses",
    topicId: "t_mit1806_linear_equations_mit1806_matrix_ops",
    topicName: "Matrix Operations",
    similarity: 0.82,
  });

  it("turns a contextual subject goal into bounded concept targets", async () => {
    const selectGoalScope = vi.fn(async () => ({
      coverage: "full" as const,
      targetConceptIds: ["c_mit1806_matrix_ops", "c_mit1806_linear_transformations"],
      reason: "Only the matrix foundations needed for deep learning",
    }));
    const { result: positioned } = await positionLearningGoal(
      { query, language: "zh" },
      {
        searchKnowledgeGraphNodes: vi.fn(async () => searchResponse(query, [result])),
        runStage2Positioning: vi.fn(async () => ({
          outcome: "positioned" as const,
          graphId: "linear_algebra",
          mode: "goal_scoped" as const,
          startTopicId: "root",
          targetConceptIds: [],
        })),
        selectGoalScope,
      },
    );

    expect(positioned).toMatchObject({
      branch: "positioned",
      graphId: "linear_algebra",
      mode: "goal_scoped",
      targetConceptIds: ["c_mit1806_matrix_ops", "c_mit1806_linear_transformations"],
      learningGoal: query,
    });
    const plan = planFromPositioning(positioned);
    expect(plan).toMatchObject({
      branch: "positioned",
      courseContext: {
        scope: "goal",
        learningGoal: query,
        targetConceptIds: ["c_mit1806_matrix_ops", "c_mit1806_linear_transformations"],
      },
    });
    expect(selectGoalScope).not.toHaveBeenCalled();
  });

  it("routes partial coverage to generated-course creation instead of a full KG", async () => {
    const uncoveredQuery = "我想要学习面向机器人运动学的线性代数";
    const { result: positioned } = await positionLearningGoal(
      { query: uncoveredQuery, language: "zh" },
      {
        searchKnowledgeGraphNodes: vi.fn(async () => searchResponse(uncoveredQuery, [result])),
        runStage2Positioning: vi.fn(async () => ({
          outcome: "positioned" as const,
          graphId: "linear_algebra",
          mode: "goal_scoped" as const,
          startTopicId: "root",
          targetConceptIds: [],
        })),
        selectGoalScope: vi.fn(async () => ({ coverage: "partial" as const, targetConceptIds: [], reason: "Missing outcome" })),
      },
    );

    expect(positioned).toMatchObject({ branch: "out_of_library", freeformTopic: uncoveredQuery });
  });
});

function rawGraphJson(topicCount: number, conceptsPerTopic = 2, codeAdapted?: boolean) {
  return JSON.stringify({
    subject: "Model Context Protocol",
    subjectZh: "模型上下文协议",
    ...(codeAdapted === undefined ? {} : { codeAdapted }),
    topics: Array.from({ length: topicCount }, (_, i) => ({
      name: `Topic ${i + 1} and Friend`,
      nameZh: `主题${i + 1}`,
      concepts: Array.from({ length: conceptsPerTopic }, (_, j) => ({
        name: `Concept ${i + 1}-${j + 1}`,
        nameZh: `概念${i + 1}-${j + 1}`,
        ...(j === 0 ? { visual: "diagram", visualHint: "Diagram the message flow." } : {}),
      })),
    })),
  });
}

describe("parseGeneratedGraph", () => {
  it("accepts a well-formed graph and keeps visual affordances", () => {
    const raw = parseGeneratedGraph(rawGraphJson(6, 3));
    expect(raw?.subject).toBe("Model Context Protocol");
    expect(raw?.topics).toHaveLength(6);
    expect(raw?.topics[0].concepts).toHaveLength(3);
    expect(raw?.topics[0].concepts[0]).toMatchObject({ visual: "diagram", visualHint: "Diagram the message flow." });
  });

  it("truncates to 3 concepts per topic and drops invalid visuals", () => {
    const raw = parseGeneratedGraph(
      JSON.stringify({
        subject: "S",
        subjectZh: "",
        topics: Array.from({ length: 4 }, (_, i) => ({
          name: `T${i}`,
          concepts: Array.from({ length: 5 }, (_, j) => ({ name: `C${j}`, visual: "hologram", visualHint: "x" })),
        })),
      }),
    );
    expect(raw?.topics[0].concepts).toHaveLength(3);
    expect(raw?.topics[0].concepts[0].visual).toBeUndefined();
    expect(raw?.topics[0].concepts[0].visualHint).toBeUndefined();
  });

  it("rejects one-concept topics and nulls graphs with too few usable topics", () => {
    const raw = parseGeneratedGraph(
      JSON.stringify({
        subject: "S",
        subjectZh: "",
        topics: [
          { name: "Single Concept Topic", concepts: [{ name: "Only Concept" }] },
          ...Array.from({ length: 4 }, (_, i) => ({
            name: `Valid Topic ${i + 1}`,
            concepts: [{ name: `A${i}` }, { name: `B${i}` }],
          })),
        ],
      }),
    );

    expect(raw?.topics).toHaveLength(4);
    expect(raw?.topics.some((topic) => topic.name === "Single Concept Topic")).toBe(false);
    expect(parseGeneratedGraph(rawGraphJson(4, 1))).toBeNull();
  });

  it("rejects graphs with fewer than four usable topics", () => {
    expect(parseGeneratedGraph(rawGraphJson(3))).toBeNull();
    expect(parseGeneratedGraph("not json")).toBeNull();
  });

  it("reads codeAdapted strictly (only literal true; absent defaults to false)", () => {
    expect(parseGeneratedGraph(rawGraphJson(4, 2, true))?.codeAdapted).toBe(true);
    expect(parseGeneratedGraph(rawGraphJson(4, 2, false))?.codeAdapted).toBe(false);
    expect(parseGeneratedGraph(rawGraphJson(4))?.codeAdapted).toBe(false);
  });
});

describe("toTopicGraph", () => {
  it("builds a linear TopicGraph with deterministic gen_ ids", () => {
    const key = normalizeTopicKey("MCP 协议");
    const raw = parseGeneratedGraph(rawGraphJson(5))!;
    const graph = toTopicGraph(raw, key);
    const again = toTopicGraph(raw, key);

    expect(graph.graphId).toMatch(/^gen_model_context_protocol_[0-9a-f]{8}$/);
    expect(graph.graphId).toBe(again.graphId);
    expect(graph.topics).toHaveLength(5);
    expect(graph.topics[0].isRoot).toBe(true);
    expect(graph.topics[0].prereqTopics).toEqual([]);
    expect(graph.topics[0].successors).toEqual([{ topicId: graph.topics[1].topicId, hard: true }]);
    expect(graph.topics[4].successors).toEqual([]);
    expect(graph.topics[2].prereqTopics).toEqual([graph.topics[1].topicId]);
    expect(graph.topics.map((t) => t.defaultOrder)).toEqual([1, 2, 3, 4, 5]);
    // 2-3 concepts per topic, ordered — the lesson planner's contract.
    for (const t of graph.topics) {
      expect(t.conceptIds.length).toBeGreaterThanOrEqual(2);
      expect(t.conceptIds.length).toBeLessThanOrEqual(3);
      expect(t.conceptIds.map((c) => c.defaultOrder)).toEqual(t.conceptIds.map((_, i) => i + 1));
    }
    // concept ids unique across the graph (mastery is keyed by graphId+conceptId)
    const ids = graph.topics.flatMap((t) => t.conceptIds.map((c) => c.conceptId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries codeAdapted onto the TopicGraph only when true", () => {
    const key = normalizeTopicKey("MCP 协议");
    expect(toTopicGraph(parseGeneratedGraph(rawGraphJson(4, 2, true))!, key).codeAdapted).toBe(true);
    expect(toTopicGraph(parseGeneratedGraph(rawGraphJson(4, 2, false))!, key).codeAdapted).toBeUndefined();
  });

  it("emits a linear concept prereq chain carrying the generator's reasons", () => {
    const raw = parseGeneratedGraph(
      JSON.stringify({
        subject: "S",
        subjectZh: "",
        topics: Array.from({ length: 4 }, (_, i) => ({
          name: `T${i}`,
          concepts: [
            { name: `A${i}`, ...(i === 0 ? {} : { reason: `follows previous topic ${i}` }) },
            { name: `B${i}`, reason: `B${i} needs A${i}` },
          ],
        })),
      }),
    )!;
    const graph = toTopicGraph(raw, normalizeTopicKey("reasoned"));
    const ids = graph.topics.flatMap((t) => t.conceptIds.map((c) => c.conceptId));
    // one edge per adjacent pair in the flattened linear order
    expect(graph.conceptEdges).toHaveLength(ids.length - 1);
    expect(graph.conceptEdges!.every((e) => e.strength === "hard")).toBe(true);
    // first edge (into the 2nd concept of topic 0) carries its reason; the very
    // first concept has none, so no edge points at it.
    expect(graph.conceptEdges![0]).toMatchObject({ from: ids[0], to: ids[1], reason: "B0 needs A0" });
    expect(graph.conceptEdges!.some((e) => e.to === ids[0])).toBe(false);
  });

  it("carries per-concept assessmentHint onto TopicConcepts", () => {
    const raw = parseGeneratedGraph(
      JSON.stringify({
        subject: "S",
        subjectZh: "",
        topics: Array.from({ length: 4 }, (_, i) => ({
          name: `T${i}`,
          concepts: [
            { name: `A${i}`, assessmentHint: `test A${i} skill` },
            { name: `B${i}` },
          ],
        })),
      }),
    )!;
    const graph = toTopicGraph(raw, normalizeTopicKey("assess"));
    expect(graph.topics[0].conceptIds[0].assessmentHint).toBe("test A0 skill");
    expect(graph.topics[0].conceptIds[1].assessmentHint).toBeUndefined();
  });

  it("omits conceptEdges entirely when the model supplied no reasons", () => {
    const graph = toTopicGraph(parseGeneratedGraph(rawGraphJson(4))!, normalizeTopicKey("no-reason"));
    // edges still emitted (linear chain), just without reason fields
    expect(graph.conceptEdges!.every((e) => e.reason === undefined)).toBe(true);
  });
});

describe("parseGeneratedGraph reason handling", () => {
  it("keeps a bounded reason string and drops empty ones", () => {
    const raw = parseGeneratedGraph(
      JSON.stringify({
        subject: "S",
        subjectZh: "",
        topics: Array.from({ length: 4 }, (_, i) => ({
          name: `T${i}`,
          concepts: [
            { name: `A${i}`, reason: "   " },
            { name: `B${i}`, reason: "x".repeat(300) },
          ],
        })),
      }),
    )!;
    expect(raw.topics[0].concepts[0].reason).toBeUndefined();
    expect(raw.topics[0].concepts[1].reason).toHaveLength(240);
  });
});

describe("code eligibility for generated graphs", () => {
  const kgFor = (codeEligible?: boolean): CourseContext => ({
    learningPathType: "linear",
    graphId: "gen_mcp_and_agent_architecture_ce27a911",
    startTopic: {
      topicId: "t1_agent_foundations",
      name: "Agent Foundations and Protocol Motivation",
      concepts: [{ conceptId: "t1c1_agent_foundations", name: "Agent Foundations", defaultOrder: 1 }],
    },
    targetConceptId: null,
    nextTopic: null,
    ...(codeEligible === undefined ? {} : { codeEligible }),
  });

  it("codeEligible=true allows code blocks for subjects the lexical patterns miss", () => {
    expect(isCodeEligibleLessonContext(kgFor())).toBe(false);
    expect(isCodeEligibleLessonContext(kgFor(true))).toBe(true);
  });

  it("codeEligible=false still defers to lexical patterns and explicit intent", () => {
    expect(isCodeEligibleLessonContext(kgFor(false))).toBe(false);
    expect(isCodeEligibleLessonContext(kgFor(false), "我要用 Python 实现二分查找")).toBe(true);
  });
});

describe("normalizeTopicKey", () => {
  it("collapses case, punctuation, and width variants onto one key", () => {
    expect(normalizeTopicKey("MCP 协议!")).toBe(normalizeTopicKey("mcp 协议"));
    expect(normalizeTopicKey("Agent   架构")).toBe(normalizeTopicKey("agent 架构"));
    expect(normalizeTopicKey("ＭＣＰ")).toBe(normalizeTopicKey("mcp"));
  });
});
