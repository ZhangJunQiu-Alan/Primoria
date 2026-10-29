import { describe, expect, it } from "vitest";
import { decideNextStep, type DecideNextStepInput } from "../src/lib/courses/learning-progress-decider";
import type { TopicGraph } from "../src/lib/knowledge-graph/topic-graph";

const graph: TopicGraph = {
  graphId: "test_language",
  subject: "Algebra",
  topics: [
    { topicId: "vectors", name: "Vectors", defaultOrder: 1, isRoot: true, prereqTopics: [], successors: [], conceptIds: [{ conceptId: "addition", name: "Addition", nameZh: "加法", defaultOrder: 1 }] },
    { topicId: "matrices", name: "Matrices", defaultOrder: 2, isRoot: false, prereqTopics: ["vectors"], successors: [], conceptIds: [{ conceptId: "product", name: "Product", nameZh: "乘积", defaultOrder: 1 }] },
  ],
};
const base: DecideNextStepInput = { graphId: graph.graphId, graph, currentTopicId: "matrices", currentConceptIds: ["product"], currentLessonSortKey: 1, nextLesson: null, masteryByConcept: new Map() };

describe("post-lesson recommendations follow course language", () => {
  it.each(["en", "en-SG", "zh-CN"])("localizes all four branches for %s without changing targets", (language) => {
    const chinese = language.startsWith("zh");
    const next = decideNextStep({ ...base, language, nextLesson: { id: "next", title: chinese ? "下一课" : "Next lesson", topicId: "matrices", sortKey: 2 } });
    const completed = decideNextStep({ ...base, language });
    const weak = decideNextStep({ ...base, language, masteryByConcept: new Map([["product", "weak"]]) });
    const prerequisite = decideNextStep({ ...base, language, masteryByConcept: new Map([["product", "weak"], ["addition", "weak"]]) });
    expect(next).toMatchObject({ kind: "next", targetLessonId: "next" });
    expect(completed.kind).toBe("course_complete");
    expect(weak).toMatchObject({ targetConceptId: "product", proposedSortKey: 2, proposedTitle: chinese ? "补救：乘积" : "Review: Product" });
    expect(prerequisite).toMatchObject({ targetConceptId: "addition", targetTopicId: "vectors", proposedSortKey: 2, proposedTitle: chinese ? "补救：加法" : "Review: Addition" });
    for (const decision of [next, completed, weak, prerequisite]) {
      expect(/[\u3400-\u9fff]/u.test(decision.reason)).toBe(chinese);
    }
    expect(prerequisite.reason).toContain(chinese ? "加法" : "Addition");
    expect(prerequisite.reason).toContain(chinese ? "乘积" : "Product");
  });
});
