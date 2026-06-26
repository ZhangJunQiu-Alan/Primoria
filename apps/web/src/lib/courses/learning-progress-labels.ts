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
      return "Good Job！";
    case "course_complete":
      return "恭喜，课程完成 🎉";
    default:
      return "学习建议";
  }
}

/** Primary-button label for the recommendation popup, by decision kind. */
export function learningDecisionAcceptLabel(decision: LearningDecision): string {
  switch (decision.kind) {
    case "remediation":
      return "是";
    case "next":
      return decision.nextLessonTitle ? `开始学习「${decision.nextLessonTitle}」` : "开始下一节";
    case "course_complete":
      return "回首页";
    default:
      return "继续";
  }
}
