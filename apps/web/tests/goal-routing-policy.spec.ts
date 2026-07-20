import { describe, expect, it, vi } from "vitest";

import {
  classifyDeterministicGoal,
  findExactNamedGoalAnchor,
} from "../src/lib/knowledge-graph/goal-routing-policy";
import { positionLearningGoal } from "../src/lib/knowledge-graph/position-learning-goal";

describe("deterministic learning-goal policy", () => {
  it.each([
    ["I want to learn architecture", ["computer_architecture", "software_construction", "deep_learning"]],
    ["教我搜索", ["artificial_intelligence", "data_structures_and_algorithms"]],
    ["Build me a course on recursion", ["sicp_cs61a", "data_structures_and_algorithms", "python_fundamentals"]],
  ])("clarifies a bare cross-subject topic: %s", (query, candidateGraphIds) => {
    expect(classifyDeterministicGoal(query)).toEqual({ kind: "clarify", candidateGraphIds });
  });

  it.each([
    "Teach me something advanced",
    "I want to understand models",
    "我学习上需要帮助",
    "教我数据",
  ])("rejects a goal with no usable subject: %s", (query) => {
    expect(classifyDeterministicGoal(query)).toEqual({ kind: "fallback" });
  });

  it.each([
    ["Teach me algorithms", "data_structures_and_algorithms", "t_ucb61b_asymptotics", "directed"],
    ["我想学习概率", "discrete_math_and_probability", "topic_discrete_prob", "directed"],
    ["I want to understand concurrency", "software_construction", "t_mit6031_concurrency", "directed"],
    ["通过游戏 AI 和寻路教我算法", "artificial_intelligence", "ai_search_part1", "goal_scoped"],
    ["Teach me information theory through modern communication systems", "information_theory", "t_infotheory_basics", "goal_scoped"],
    ["创建一门以应用安全为核心的全栈 Web 课程", "web_applications", "web_security", "goal_scoped"],
  ])("uses a stable dedicated route: %s", (query, graphId, startTopicId, mode) => {
    expect(classifyDeterministicGoal(query)).toEqual({ kind: "positioned", graphId, startTopicId, mode });
  });

  it("does not intercept domain-bearing goals that contain generic words", () => {
    expect(classifyDeterministicGoal("Teach me advanced calculus with geometric models")).toBeNull();
    expect(classifyDeterministicGoal("I want to learn data structures")).toBeNull();
  });

  it.each([
    "I want a linear algebra course oriented toward deep learning",
    "我想学习用于理解深度学习的线性代数",
  ])("pins the protected linear-algebra-for-deep-learning scope: %s", (query) => {
    expect(classifyDeterministicGoal(query)).toEqual({
      kind: "positioned",
      graphId: "linear_algebra",
      mode: "goal_scoped",
      startTopicId: "t_mit1806_linear_equations",
      targetConceptIds: [
        "c_mit1806_vectors",
        "c_mit1806_matrix_ops",
        "c_mit1806_linear_transformations",
      ],
    });
  });

  it.each([
    "I want to connect computer architecture with compiler optimization",
    "设计一门结合生物学与计算数据分析的课程",
    "Build a course that teaches calculus through mechanics and electromagnetism",
    "通过模拟和科学编程教我化学",
    "I want a mathematics curriculum focused on artificial intelligence",
    "设计一门从物理学过渡到实用电子设计的课程",
    "教我面向机器学习的概率与统计",
  ])("keeps protected multi-outcome goals out of a partial library match: %s", (query) => {
    expect(classifyDeterministicGoal(query)).toEqual({ kind: "out_of_library", topic: query });
  });

  it.each(["Teach me databases", "教我数据库", "I want to learn security", "我想学习安全"])(
    "does not force an uncovered bare subject into an adjacent course: %s",
    (query) => {
      expect(classifyDeterministicGoal(query)).toEqual({ kind: "out_of_library", topic: query });
    },
  );

  it("routes the known LLM architecture plus application boundary outside a partial graph", () => {
    expect(classifyDeterministicGoal(
      "I want to learn large language model architecture and how to use LLMs in AI applications",
    )).toMatchObject({ kind: "out_of_library" });
    expect(classifyDeterministicGoal("我想要学习大模型架构和在AI应用中的使用")).toMatchObject({ kind: "out_of_library" });
  });

  it("finds an exact bilingual topic or concept inside an explicit graph", () => {
    expect(findExactNamedGoalAnchor(
      "Study Biodiversity Sampling and Conservation in Cambridge International A-Level Biology",
      ["a_level_biology"],
    )).toEqual({ kind: "topic", graphId: "a_level_biology", topicId: "bio_biodiversity" });
    expect(findExactNamedGoalAnchor(
      "在剑桥国际 A-Level 生物学中，我想深入理解显微镜",
      ["a_level_biology"],
    )).toEqual({
      kind: "concept",
      graphId: "a_level_biology",
      topicId: "bio_cell_structure",
      conceptId: "bio_microscopy",
    });
    expect(findExactNamedGoalAnchor(
      "帮我设计一条围绕烃的剑桥国际 A-Level 化学学习路径",
      ["a_level_chemistry"],
    )).toEqual({ kind: "topic", graphId: "a_level_chemistry", topicId: "che_hydrocarbons" });
    expect(findExactNamedGoalAnchor(
      "Teach me models and units using the Mainland China senior high school physics curriculum",
      ["senior_secondary_physics"],
    )).toEqual({
      kind: "topic",
      graphId: "senior_secondary_physics",
      topicId: "cn_sh_physics_topic_mechanics_models_units",
    });
  });

  it("returns policy results without calling retrieval or a model", async () => {
    const searchKnowledgeGraphNodes = vi.fn();
    const runStage2Positioning = vi.fn();
    const { result } = await positionLearningGoal(
      { query: "I want to learn architecture", language: "en" },
      { searchKnowledgeGraphNodes, runStage2Positioning },
    );

    expect(result.branch).toBe("clarify_subject");
    expect(result.candidates?.map((candidate) => candidate.graphId)).toEqual([
      "computer_architecture",
      "software_construction",
      "deep_learning",
    ]);
    expect(searchKnowledgeGraphNodes).not.toHaveBeenCalled();
    expect(runStage2Positioning).not.toHaveBeenCalled();
  });

  it("uses an explicit curriculum topic name without retrieval or model sampling", async () => {
    const searchKnowledgeGraphNodes = vi.fn();
    const runStage2Positioning = vi.fn();
    const { result } = await positionLearningGoal(
      {
        query: "I already know Cambridge International A-Level Biology basics; teach Biodiversity Sampling and Conservation",
        language: "en",
      },
      { searchKnowledgeGraphNodes, runStage2Positioning },
    );

    expect(result).toMatchObject({
      branch: "positioned",
      graphId: "a_level_biology",
      mode: "directed",
      startTopicId: "bio_biodiversity",
      targetConceptIds: ["bio_biodiversity_sampling", "bio_conservation"],
    });
    expect(searchKnowledgeGraphNodes).not.toHaveBeenCalled();
    expect(runStage2Positioning).not.toHaveBeenCalled();
  });
});
