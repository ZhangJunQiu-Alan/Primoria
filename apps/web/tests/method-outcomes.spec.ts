import { describe, expect, it } from "vitest";

import {
  formatMethodOutcomes,
  MIN_LEARNERS_PER_ARM,
  summarizeMethodOutcomes,
  type ConceptOutcomeRow,
  type MethodArmRow,
} from "@/lib/analysis/method-outcomes";

function arm(owner: string, delivered: string, conceptId = "c1", factor = "explanation_form"): MethodArmRow {
  return { ownerId: owner, lessonId: `${owner}-lesson`, conceptId, factor, delivered };
}

function outcome(owner: string, correct: number, total: number, conceptId = "c1"): ConceptOutcomeRow {
  return { ownerId: owner, lessonId: `${owner}-lesson`, conceptId, correct, total };
}

/** n learners per arm, `analogy` scoring higher, so the reported gap has a known
 * sign and size. */
function cohort(perArm: number, analogyCorrect: number, textCorrect: number) {
  const arms: MethodArmRow[] = [];
  const outcomes: ConceptOutcomeRow[] = [];
  for (let i = 0; i < perArm; i += 1) {
    arms.push(arm(`a${i}`, "analogy"));
    outcomes.push(outcome(`a${i}`, analogyCorrect, 4));
    arms.push(arm(`t${i}`, "text"));
    outcomes.push(outcome(`t${i}`, textCorrect, 4));
  }
  return { arms, outcomes };
}

describe("summarizeMethodOutcomes", () => {
  it("returns nothing when there are no assignments", () => {
    expect(summarizeMethodOutcomes([], [outcome("u1", 2, 4)])).toEqual([]);
  });

  it("ignores assignments the learner never produced evidence for", () => {
    // An assigned concept the learner never reached carries no information;
    // counting it as a zero would punish the arm for the learner quitting.
    const reports = summarizeMethodOutcomes([arm("u1", "analogy")], []);
    expect(reports).toEqual([]);
  });

  it("ignores outcomes that were never randomized", () => {
    // Unrandomized outcomes are exactly the confounded rows this design excludes.
    const reports = summarizeMethodOutcomes([arm("u1", "analogy")], [outcome("u1", 3, 4), outcome("u2", 0, 4)]);
    expect(reports).toHaveLength(1);
    expect(reports[0].arms).toHaveLength(1);
    expect(reports[0].arms[0].learners).toBe(1);
  });

  it("counts accuracy per arm and reports the gap and its direction", () => {
    const { arms, outcomes } = cohort(MIN_LEARNERS_PER_ARM, 3, 2);
    const [report] = summarizeMethodOutcomes(arms, outcomes);
    const analogy = report.arms.find((a) => a.arm === "analogy")!;
    const text = report.arms.find((a) => a.arm === "text")!;
    expect(analogy.accuracy).toBeCloseTo(0.75);
    expect(text.accuracy).toBeCloseTo(0.5);
    expect(report.leading).toBe("analogy");
    expect(report.delta).toBeCloseTo(0.25);
    expect(report.sufficient).toBe(true);
  });

  it("flags a sample too small to act on", () => {
    const { arms, outcomes } = cohort(MIN_LEARNERS_PER_ARM - 1, 4, 1);
    const [report] = summarizeMethodOutcomes(arms, outcomes);
    // The gap is huge and completely untrustworthy; the flag is what stops it
    // from being read as a finding.
    expect(report.delta).toBeCloseTo(0.75);
    expect(report.sufficient).toBe(false);
  });

  it("counts learners, not questions, as the sample", () => {
    const { arms, outcomes } = cohort(MIN_LEARNERS_PER_ARM, 3, 2);
    const [report] = summarizeMethodOutcomes(arms, outcomes);
    for (const a of report.arms) {
      expect(a.learners).toBe(MIN_LEARNERS_PER_ARM);
      expect(a.questions).toBe(MIN_LEARNERS_PER_ARM * 4);
    }
  });

  it("does not double-count a repeated assignment row", () => {
    const rows = [arm("u1", "analogy"), arm("u1", "analogy")];
    const [report] = summarizeMethodOutcomes(rows, [outcome("u1", 2, 4)]);
    expect(report.arms[0].cells).toBe(1);
    expect(report.arms[0].questions).toBe(4);
  });

  it("sums repeated outcome rows for one cell rather than dropping them", () => {
    const [report] = summarizeMethodOutcomes([arm("u1", "analogy")], [outcome("u1", 1, 2), outcome("u1", 2, 2)]);
    expect(report.arms[0].questions).toBe(4);
    expect(report.arms[0].correct).toBe(3);
  });

  it("keeps factors separate", () => {
    const arms = [arm("u1", "analogy"), arm("u1", "visual", "c1", "media_form")];
    const [explanation, media] = summarizeMethodOutcomes(arms, [outcome("u1", 2, 4)]);
    expect(explanation.factor).toBe("explanation_form");
    expect(media.factor).toBe("media_form");
    expect(media.arms[0].arm).toBe("visual");
  });

  it("withholds a gap until both arms have outcomes", () => {
    const [report] = summarizeMethodOutcomes([arm("u1", "analogy")], [outcome("u1", 2, 4)]);
    expect(report.delta).toBeNull();
    expect(report.leading).toBeNull();
    expect(report.sufficient).toBe(false);
  });
});

describe("formatMethodOutcomes", () => {
  it("says so plainly when there is nothing to report", () => {
    expect(formatMethodOutcomes([])).toContain("No randomized method assignments");
  });

  it("prints the sample next to every number and calls out a thin one", () => {
    const { arms, outcomes } = cohort(3, 4, 1);
    const text = formatMethodOutcomes(summarizeMethodOutcomes(arms, outcomes));
    expect(text).toContain("explanation_form");
    expect(text).toContain("Too small to act on");
  });

  it("reports the gap once the sample clears the floor", () => {
    const { arms, outcomes } = cohort(MIN_LEARNERS_PER_ARM, 3, 2);
    const text = formatMethodOutcomes(summarizeMethodOutcomes(arms, outcomes));
    expect(text).toContain("25.0 points toward `analogy`");
    expect(text).not.toContain("Too small");
  });
});
