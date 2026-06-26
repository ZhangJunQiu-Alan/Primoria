#!/usr/bin/env tsx

import {
  learningDecisionAcceptLabel,
  learningDecisionHeadline,
  learningProgressStageLabel,
} from "../src/lib/courses/learning-progress-labels.ts";
import type { LearningDecision } from "../src/lib/courses/learning-progress-decider.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function decision(kind: LearningDecision["kind"], nextLessonTitle: string | null = null): LearningDecision {
  return { kind, reason: "r", targetTopicId: null, targetConceptId: null, proposedSortKey: null, proposedTitle: null, nextLessonTitle };
}

function main() {
  assert(learningProgressStageLabel({ stage: "queued" }) === "Reviewing your progress", "queued stage label");
  assert(learningProgressStageLabel({ stage: "mastery" }) === "Updating mastery", "mastery stage label");
  assert(learningProgressStageLabel({ stage: "deciding" }) === "Planning your next step", "deciding stage label");
  assert(learningProgressStageLabel({ stage: "completed" }) === "Recommendation ready", "completed stage label");

  assert(learningDecisionHeadline(decision("remediation")) === "建议先补一节", "remediation headline");
  assert(learningDecisionHeadline(decision("next")) === "Good Job！", "next headline");
  assert(learningDecisionHeadline(decision("course_complete")) === "恭喜，课程完成 🎉", "course_complete headline");

  assert(learningDecisionAcceptLabel(decision("remediation")) === "是", "remediation accept label");
  assert(learningDecisionAcceptLabel(decision("next", "导数")) === "开始学习「导数」", "next accept label uses lesson name");
  assert(learningDecisionAcceptLabel(decision("next")) === "开始下一节", "next accept label fallback");
  assert(learningDecisionAcceptLabel(decision("course_complete")) === "回首页", "course_complete accept label");

  process.stdout.write("[learning-progress-labels.unit] ALL CHECKS PASSED\n");
}

main();
