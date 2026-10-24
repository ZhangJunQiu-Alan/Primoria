import { describe, expect, it } from "vitest";

import { decideNextStep } from "@/lib/courses/learning-progress-decider";
import type { TopicGraph } from "@/lib/knowledge-graph/topic-graph";
import type { MasteryStatus } from "@/lib/mastery/store";

// gen_* and mat_* graphs are not in the static registry, so the decider must
// work from the graph the processor resolved instead of getTopicGraph(graphId).
const graph: TopicGraph = {
  graphId: "mat_0123456789abcdef",
  subject: "向量",
  topics: [
    {
      topicId: "t1_vectors",
      name: "Vectors",
      defaultOrder: 1,
      conceptIds: [
        { conceptId: "t1c1_vector", name: "Vector", defaultOrder: 1 },
        { conceptId: "t1c2_addition", name: "Addition", defaultOrder: 2 },
      ],
      successors: [{ topicId: "t2_matrices", hard: true }],
      prereqTopics: [],
      isRoot: true,
    },
    {
      topicId: "t2_matrices",
      name: "Matrices",
      defaultOrder: 2,
      conceptIds: [
        { conceptId: "t2c1_matrix", name: "Matrix", defaultOrder: 1 },
        { conceptId: "t2c2_product", name: "Product", defaultOrder: 2 },
      ],
      successors: [],
      prereqTopics: ["t1_vectors"],
      isRoot: false,
    },
  ],
};

const base = {
  graphId: graph.graphId,
  graph,
  currentTopicId: "t2_matrices",
  currentConceptIds: ["t2c1_matrix", "t2c2_product"],
  currentLessonSortKey: 2,
  nextLesson: null,
};

describe("decideNextStep with a resolved non-library graph", () => {
  it("completes the course when nothing is weak", () => {
    expect(decideNextStep({ ...base, masteryByConcept: new Map() }).kind).toBe("course_complete");
  });

  it("remediates a weak prerequisite concept as the root cause", () => {
    const mastery = new Map<string, MasteryStatus>([
      ["t2c2_product", "weak"],
      ["t1c2_addition", "weak"],
    ]);
    const decision = decideNextStep({ ...base, masteryByConcept: mastery });
    expect(decision).toMatchObject({
      kind: "remediation",
      targetConceptId: "t1c2_addition",
      targetTopicId: "t1_vectors",
      proposedSortKey: 3,
    });
  });
});
