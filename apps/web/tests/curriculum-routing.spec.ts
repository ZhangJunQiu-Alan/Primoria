import { describe, expect, it, vi } from "vitest";

import {
  detectCurriculumContext,
  resolveCurriculumRoute,
  resolveLearnerCurriculumContext,
} from "../src/lib/knowledge-graph/curriculum-routing";
import { positionLearningGoal } from "../src/lib/knowledge-graph/position-learning-goal";
import { encodeKnowledgeGraphQuery } from "../src/lib/knowledge-graph/query-encoding";
import { getTopicGraph } from "../src/lib/knowledge-graph/topic-graph";

describe("curriculum routing policy", () => {
  it("does not treat a Chinese-language goal as Mainland China curriculum context", () => {
    expect(detectCurriculumContext("我想学习高中数学")).toBeNull();
    expect(resolveCurriculumRoute({ query: "我想学习高中数学" })).toMatchObject({
      kind: "clarify",
      graphIds: expect.arrayContaining([
        "a_level_mathematics",
        "senior_secondary_mathematics",
        "singapore_h2_mathematics",
        "singapore_secondary_mathematics",
      ]),
    });
  });

  it("uses an explicit Mainland China learner fact for a generic high-school goal", () => {
    const learnerContext = resolveLearnerCurriculumContext([
      { text: "我目前在中国大陆读高中。", category: "profile_context" },
    ]);
    expect(learnerContext).toEqual({ system: null, region: "mainland_china" });
    expect(resolveCurriculumRoute({ query: "我想学习高中数学", learnerContext })).toEqual({
      kind: "restricted",
      graphIds: ["senior_secondary_mathematics"],
      context: learnerContext,
    });
  });

  it("lets an explicit goal override conflicting learner background", () => {
    const learnerContext = { system: null, region: "mainland_china" } as const;
    expect(resolveCurriculumRoute({ query: "I want to learn Singapore H2 Mathematics", learnerContext })).toEqual({
      kind: "restricted",
      graphIds: ["singapore_h2_mathematics"],
      context: { system: "singapore_h2", region: "singapore" },
    });
    expect(resolveCurriculumRoute({ query: "I study A-Level Mathematics in Singapore", learnerContext })).toEqual({
      kind: "restricted",
      graphIds: ["singapore_h2_mathematics"],
      context: { system: "singapore_h2", region: "singapore" },
    });
  });

  it("keeps Singapore mathematics ambiguous when the stage is unknown", () => {
    const learnerContext = resolveLearnerCurriculumContext([
      { text: "I study in Singapore.", category: "profile_context" },
    ]);
    expect(resolveCurriculumRoute({ query: "I want to learn mathematics", learnerContext })).toEqual({
      kind: "clarify",
      graphIds: ["singapore_h2_mathematics", "singapore_secondary_mathematics"],
    });
  });

  it("does not choose from conflicting curriculum facts", () => {
    expect(resolveLearnerCurriculumContext([
      { text: "I follow the Mainland China senior high school curriculum.", category: "profile_context" },
      { text: "I now follow Singapore H2.", category: "profile_context" },
    ])).toBeNull();
  });

  it("routes a confirmed curriculum with no matching library graph out of library", async () => {
    const learnerContext = {
      system: "mainland_china_junior_secondary",
      region: "mainland_china",
    } as const;
    expect(resolveCurriculumRoute({ query: "我想学习初中数学", learnerContext })).toEqual({
      kind: "uncovered",
      context: learnerContext,
    });

    const searchKnowledgeGraphNodes = vi.fn();
    const { result } = await positionLearningGoal(
      { query: "我想学习初中数学", curriculumContext: learnerContext },
      { searchKnowledgeGraphNodes },
    );

    expect(result).toMatchObject({
      branch: "out_of_library",
      freeformTopic: expect.stringContaining("Mainland China junior secondary curriculum"),
    });
    expect(searchKnowledgeGraphNodes).not.toHaveBeenCalled();
  });

  it("short-circuits a generic shared subject to clarification before recall", async () => {
    const searchKnowledgeGraphNodes = vi.fn();
    const runStage2Positioning = vi.fn();
    const { result } = await positionLearningGoal(
      { query: "我想学习高中数学", language: "zh" },
      { searchKnowledgeGraphNodes, runStage2Positioning },
    );

    expect(result).toMatchObject({
      branch: "clarify_subject",
      candidates: expect.arrayContaining([
        expect.objectContaining({ graphId: "senior_secondary_mathematics" }),
        expect.objectContaining({ graphId: "singapore_h2_mathematics" }),
      ]),
    });
    expect(searchKnowledgeGraphNodes).not.toHaveBeenCalled();
    expect(runStage2Positioning).not.toHaveBeenCalled();
  });

  it("constrains recall and Stage 2 to the curriculum resolved from facts", async () => {
    const query = "我想学习高中数学";
    const graphId = "senior_secondary_mathematics";
    const root = [...getTopicGraph(graphId).topics].sort((a, b) => a.defaultOrder - b.defaultOrder)[0]!;
    const searchKnowledgeGraphNodes = vi.fn(async () => ({
      encodedQuery: encodeKnowledgeGraphQuery(query),
      graphId,
      modelVersion: "test-model",
      topK: 15,
      results: [{
        graphId,
        kind: "topic" as const,
        nodeId: root.topicId,
        name: root.name,
        description: null,
        topicId: null,
        topicName: null,
        embedText: root.name,
        modelVersion: "test-model",
        distance: 0.1,
        similarity: 0.9,
      }],
    }));
    const runStage2Positioning = vi.fn(async () => ({
      outcome: "positioned" as const,
      graphId,
      mode: "subject_start" as const,
      startTopicId: root.topicId,
    }));

    const { result } = await positionLearningGoal(
      { query, curriculumContext: { system: null, region: "mainland_china" } },
      { searchKnowledgeGraphNodes, runStage2Positioning },
    );

    expect(searchKnowledgeGraphNodes).toHaveBeenCalledWith(
      expect.objectContaining({ graphId: "senior_secondary_mathematics" }),
    );
    expect(runStage2Positioning).toHaveBeenCalledWith(
      expect.objectContaining({
        graphs: [{ graphId, subject: "Mainland China Senior High School Mathematics" }],
        librarySubjects: [{ graphId, subject: "Mainland China Senior High School Mathematics" }],
      }),
      undefined,
    );
    expect(result).toMatchObject({ branch: "positioned", graphId });
  });

  it("does not let lexical subject matches escape an explicit curriculum graph", async () => {
    const query = "I want to learn Cambridge International A-Level Biology from the beginning";
    const graphId = "a_level_biology";
    const root = [...getTopicGraph(graphId).topics].sort((a, b) => a.defaultOrder - b.defaultOrder)[0]!;
    const runStage2Positioning = vi.fn(async () => ({
      outcome: "positioned" as const,
      graphId,
      mode: "subject_start" as const,
      startTopicId: root.topicId,
    }));

    const { result } = await positionLearningGoal(
      { query, language: "en" },
      {
        searchKnowledgeGraphNodes: vi.fn(async () => ({
          encodedQuery: encodeKnowledgeGraphQuery(query),
          graphId,
          modelVersion: "test-model",
          topK: 15,
          results: [{
            graphId,
            kind: "topic" as const,
            nodeId: root.topicId,
            name: root.name,
            description: null,
            topicId: null,
            topicName: null,
            embedText: root.name,
            modelVersion: "test-model",
            distance: 0.1,
            similarity: 0.9,
          }],
        })),
        runStage2Positioning,
      },
    );

    expect(runStage2Positioning).toHaveBeenCalledWith(
      expect.objectContaining({
        graphs: [{ graphId, subject: "Cambridge International A-Level Biology" }],
        librarySubjects: [{ graphId, subject: "Cambridge International A-Level Biology" }],
      }),
      undefined,
    );
    expect(result).toMatchObject({ branch: "positioned", graphId });
  });
});
