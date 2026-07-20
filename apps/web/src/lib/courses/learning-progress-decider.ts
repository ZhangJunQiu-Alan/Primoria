import { findTopicByConcept, getTopic } from "../knowledge-graph/topic-graph";
import type { MasteryStatus } from "../mastery/store";

// Pure post-lesson decision engine (docs/product/feature_specification.md §28–30). Given
// updated concept mastery, decide what the learner should do next: insert a
// same-graph remediation lesson when a concept is weak, otherwise advance to the
// persisted outline's next lesson, or report the course complete when there is no next
// lesson. Progression is driven purely by the outline + mastery — the goal anchor
// is no longer consulted to decide when a learning line ends. No I/O — topic-graph
// reads are in-memory generated data — so every branch is unit-testable. The
// result is a *recommendation*; the user confirms it before any lesson is generated.

export type LearningDecisionKind = "next" | "remediation" | "course_complete";

export type LearningDecision = {
  kind: LearningDecisionKind;
  reason: string;
  /** Exact course-outline target. Older persisted decisions may not carry it;
   * the accept route falls back to the immediate next lesson by sortKey. */
  targetLessonId?: string | null;
  targetTopicId: string | null;
  targetConceptId: string | null;
  proposedSortKey: number | null;
  proposedTitle: string | null;
  /** Name of the next outline lesson, when one exists. Drives the "start the next
   * lesson" button label and tells the UI whether a next lesson is available
   * (null = current lesson is the last in the outline). */
  nextLessonTitle: string | null;
};

export type DecideNextStepInput = {
  graphId: string;
  currentTopicId: string;
  currentConceptIds: string[];
  currentLessonSortKey: number;
  /** The actual next lesson in this persisted course outline. The global graph
   * order is not authoritative after concept-frontier bundling or goal scoping. */
  nextLesson: { id: string; title: string; topicId: string | null; sortKey: number } | null;
  /** Graph-wide concept mastery after this lesson's update. */
  masteryByConcept: Map<string, MasteryStatus>;
};

function midpointSortKey(current: number, next: number | null): number {
  return next === null ? current + 1 : (current + next) / 2;
}

export function decideNextStep(input: DecideNextStepInput): LearningDecision {
  const { graphId, currentTopicId, masteryByConcept, nextLesson } = input;
  const nextLessonTitle = nextLesson?.title ?? null;

  const isWeak = (conceptId: string) => masteryByConcept.get(conceptId) === "weak";

  // 1) Same-graph remediation if any current-topic concept is weak. Prefer the
  // root cause: if a prereq topic also has a weak concept, remediate that first.
  const weakHere = input.currentConceptIds
    .filter(isWeak)
    .map((conceptId) => {
      const ownerTopic = findTopicByConcept(graphId, conceptId);
      const concept = ownerTopic?.conceptIds.find((candidate) => candidate.conceptId === conceptId);
      return { conceptId, name: concept?.name ?? conceptId, topicId: ownerTopic?.topicId ?? currentTopicId };
    });
  if (weakHere.length > 0) {
    const rootCause = findPrereqRootCause(graphId, weakHere[0].topicId, masteryByConcept);
    const target = rootCause ?? { conceptId: weakHere[0].conceptId, name: weakHere[0].name };
    const remediationSortKey = midpointSortKey(input.currentLessonSortKey, nextLesson?.sortKey ?? null);
    const reason = rootCause
      ? `「${weakHere[0].name}」掌握较弱，可能源于先修概念「${rootCause.name}」。建议先补一节「${rootCause.name}」。`
      : `「${target.name}」掌握较弱，建议先补一节巩固后再继续。`;
    return {
      kind: "remediation",
      reason,
      targetLessonId: null,
      targetTopicId: findTopicByConcept(graphId, target.conceptId)?.topicId ?? currentTopicId,
      targetConceptId: target.conceptId,
      proposedSortKey: remediationSortKey,
      proposedTitle: `补救：${target.name}`,
      nextLessonTitle,
    };
  }

  // 2) No weak point and no next outline topic — the course is complete.
  if (!nextLesson) {
    return {
      kind: "course_complete",
      reason: "你已完成本课程的全部内容，做得很好！",
      targetLessonId: null,
      targetTopicId: currentTopicId,
      targetConceptId: null,
      proposedSortKey: null,
      proposedTitle: null,
      nextLessonTitle: null,
    };
  }

  // 3) Otherwise advance to the exact next persisted outline lesson.
  return {
    kind: "next",
    reason: `你已完成本节内容，准备好进入下一节「${nextLesson.title}」。`,
    targetLessonId: nextLesson.id,
    targetTopicId: nextLesson.topicId,
    targetConceptId: null,
    proposedSortKey: null,
    proposedTitle: null,
    nextLessonTitle,
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
