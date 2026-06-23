import { findTopicByConcept, getTopic, nextTopic } from "../knowledge-graph/topic-graph";
import type { MasteryStatus } from "../mastery/store";

// Pure post-lesson decision engine (feature_specification.md §40–41, §163). Given
// updated concept mastery, decide what the learner should do next: advance to the
// outline's next topic, insert a same-graph remediation lesson, or wrap up because
// the goal anchor is reached. No I/O — topic-graph reads are in-memory generated
// data — so every branch is unit-testable. The result is a *recommendation*; the
// user confirms it before any lesson is generated.

export type LearningDecisionKind = "next" | "remediation" | "goal_reached";

export type LearningDecision = {
  kind: LearningDecisionKind;
  reason: string;
  targetTopicId: string | null;
  targetConceptId: string | null;
  proposedSortKey: number | null;
  proposedTitle: string | null;
};

export type DecideNextStepInput = {
  graphId: string;
  currentTopicId: string;
  currentLessonSortKey: number;
  /** sortKey of the next lesson after the current one (by sortKey), or null if
   * the current lesson is last — used to place a remediation lesson between. */
  nextLessonSortKey: number | null;
  /** Graph-wide concept mastery after this lesson's update. */
  masteryByConcept: Map<string, MasteryStatus>;
  anchorConceptId: string | null;
};

function midpointSortKey(current: number, next: number | null): number {
  return next === null ? current + 1 : (current + next) / 2;
}

export function decideNextStep(input: DecideNextStepInput): LearningDecision {
  const { graphId, currentTopicId, masteryByConcept, anchorConceptId } = input;
  const topic = getTopic(graphId, currentTopicId);
  const concepts = topic?.conceptIds ?? [];

  const isWeak = (conceptId: string) => masteryByConcept.get(conceptId) === "weak";

  // 1) Same-graph remediation if any current-topic concept is weak. Prefer the
  // root cause: if a prereq topic also has a weak concept, remediate that first.
  const weakHere = concepts.filter((c) => isWeak(c.conceptId));
  if (weakHere.length > 0) {
    const rootCause = findPrereqRootCause(graphId, currentTopicId, masteryByConcept);
    const target = rootCause ?? { conceptId: weakHere[0].conceptId, name: weakHere[0].name };
    const remediationSortKey = midpointSortKey(input.currentLessonSortKey, input.nextLessonSortKey);
    const reason = rootCause
      ? `「${weakHere[0].name}」掌握较弱，可能源于先修概念「${rootCause.name}」。建议先补一节「${rootCause.name}」。`
      : `「${target.name}」掌握较弱，建议先补一节巩固后再继续。`;
    return {
      kind: "remediation",
      reason,
      targetTopicId: findTopicByConcept(graphId, target.conceptId)?.topicId ?? currentTopicId,
      targetConceptId: target.conceptId,
      proposedSortKey: remediationSortKey,
      proposedTitle: `补救：${target.name}`,
    };
  }

  // 2) No weak point. If the current topic owns the goal anchor, the learning
  // line has reached its goal.
  const ownsAnchor = anchorConceptId !== null && concepts.some((c) => c.conceptId === anchorConceptId);
  if (ownsAnchor) {
    return {
      kind: "goal_reached",
      reason: "你已掌握目标概念，达成了本条学习路径的目标。",
      targetTopicId: currentTopicId,
      targetConceptId: anchorConceptId,
      proposedSortKey: null,
      proposedTitle: null,
    };
  }

  // 3) Otherwise advance to the next outline topic; a leaf topic ends the outline.
  const next = nextTopic(graphId, currentTopicId);
  if (!next) {
    return {
      kind: "goal_reached",
      reason: "你已完成本大纲的最后一节。",
      targetTopicId: currentTopicId,
      targetConceptId: null,
      proposedSortKey: null,
      proposedTitle: null,
    };
  }
  return {
    kind: "next",
    reason: `你已掌握本节内容，准备好进入下一节「${next.name}」。`,
    targetTopicId: next.topicId,
    targetConceptId: null,
    proposedSortKey: null,
    proposedTitle: null,
  };
}

/** Among the current topic's prereq topics, find a concept that is itself weak
 * (an evidenced gap, not merely untested) to remediate as the root cause. */
function findPrereqRootCause(
  graphId: string,
  currentTopicId: string,
  masteryByConcept: Map<string, MasteryStatus>,
): { conceptId: string; name: string } | null {
  const topic = getTopic(graphId, currentTopicId);
  for (const prereqId of topic?.prereqTopics ?? []) {
    const prereq = getTopic(graphId, prereqId);
    const weak = prereq?.conceptIds.find((c) => masteryByConcept.get(c.conceptId) === "weak");
    if (weak) return { conceptId: weak.conceptId, name: weak.name };
  }
  return null;
}
