import { describe, expect, it } from "vitest";

import {
  findExplicitSubjectGraphIds,
  findPrimarySubjectGraphId,
} from "../src/lib/knowledge-graph/subject-aliases";

describe("explicit subject aliases", () => {
  it("prefers a full subject name over generic curriculum words inside it", () => {
    expect(findExplicitSubjectGraphIds(
      "Within Discrete Mathematics and Probability, teach me the PageRank algorithm",
    )).toEqual(["discrete_math_and_probability"]);
    expect(findExplicitSubjectGraphIds(
      "Within Introduction to Computer Science, teach me functions",
    )).toEqual(["introduction_to_computer_science"]);
  });

  it("keeps independent subjects in a composed goal", () => {
    expect(findExplicitSubjectGraphIds("Connect linear algebra with deep learning")).toEqual([
      "linear_algebra",
      "deep_learning",
    ]);
  });

  it("keeps same-length curriculum choices ambiguous for a bare subject", () => {
    expect(findExplicitSubjectGraphIds("I want to learn biology")).toEqual([
      "a_level_biology",
      "senior_secondary_biology",
      "singapore_h2_biology",
    ]);
  });

  it("uses containment grammar to identify the primary subject", () => {
    expect(findPrimarySubjectGraphId(
      "Within Introduction to Artificial Intelligence, focus on Machine Learning",
    )).toBe("artificial_intelligence");
    expect(findPrimarySubjectGraphId("我想在人工智能中重点学习机器学习")).toBe("artificial_intelligence");
  });

  it("does not let a generic topic word override a fully named curriculum subject", () => {
    expect(findExplicitSubjectGraphIds(
      "Within Mainland China Senior High School Biology, focus on Cell chemistry and membrane",
    )).toEqual(["senior_secondary_biology"]);
    expect(findExplicitSubjectGraphIds(
      "我想按中国普通高中生物课程重点学习细胞化学与质膜",
    )).toEqual(["senior_secondary_biology"]);
  });
});
