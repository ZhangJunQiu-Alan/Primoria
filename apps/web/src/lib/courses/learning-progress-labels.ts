import type { LearningProgressJobSummary } from "./learning-progress-jobs";
import type { LearningDecision } from "./learning-progress-decider";

// Pure, client-safe labels for the learning-progress recommendation UI. Only
// TYPES are imported from the store/decider modules, so no server-only code is
// pulled into the client bundle.

export function learningProgressStageLabel(job: Pick<LearningProgressJobSummary, "stage">): string {
  switch (job.stage) {
    case "queued":
      return "Reviewing your progress";
    case "mastery":
      return "Updating mastery";
    case "deciding":
      return "Planning your next step";
    case "completed":
      return "Recommendation ready";
    case "failed":
      return "Could not review progress";
    default:
      return "Reviewing";
  }
}

/** Headline for the recommendation popup, by decision kind. */
export function learningDecisionHeadline(decision: LearningDecision): string {
  switch (decision.kind) {
    case "remediation":
      return "建议先补一节";
    case "next":
      return "准备好进入下一节";
    case "goal_reached":
      return "你达成了学习目标";
    default:
      return "学习建议";
  }
}

/** Confirm-button label for the recommendation popup, by decision kind. */
export function learningDecisionAcceptLabel(decision: LearningDecision): string {
  switch (decision.kind) {
    case "remediation":
      return "生成补救课";
    case "next":
      return "生成下一节";
    case "goal_reached":
      return "好的";
    default:
      return "继续";
  }
}
