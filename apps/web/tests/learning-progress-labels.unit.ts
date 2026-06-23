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

function decision(kind: LearningDecision["kind"]): LearningDecision {
  return { kind, reason: "r", targetTopicId: null, targetConceptId: null, proposedSortKey: null, proposedTitle: null };
}

function main() {
  assert(learningProgressStageLabel({ stage: "queued" }) === "Reviewing your progress", "queued stage label");
  assert(learningProgressStageLabel({ stage: "mastery" }) === "Updating mastery", "mastery stage label");
  assert(learningProgressStageLabel({ stage: "deciding" }) === "Planning your next step", "deciding stage label");
  assert(learningProgressStageLabel({ stage: "completed" }) === "Recommendation ready", "completed stage label");

  assert(learningDecisionHeadline(decision("remediation")) === "建议先补一节", "remediation headline");
  assert(learningDecisionHeadline(decision("next")) === "准备好进入下一节", "next headline");
  assert(learningDecisionHeadline(decision("goal_reached")) === "你达成了学习目标", "goal headline");

  assert(learningDecisionAcceptLabel(decision("remediation")) === "生成补救课", "remediation accept label");
  assert(learningDecisionAcceptLabel(decision("next")) === "生成下一节", "next accept label");
  assert(learningDecisionAcceptLabel(decision("goal_reached")) === "好的", "goal accept label");

  process.stdout.write("[learning-progress-labels.unit] ALL CHECKS PASSED\n");
}

main();
