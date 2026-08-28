import type { LearningProgressJobSummary } from "./learning-progress-jobs";
import type { LearningDecision } from "./learning-progress-decider";
import type { I18nDictionary } from "@/lib/i18n/dictionaries";
import { formatMessage } from "@/lib/i18n/format";

type CourseLabels = I18nDictionary["course"];

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
export function learningDecisionHeadline(decision: LearningDecision, t: CourseLabels): string {
  switch (decision.kind) {
    case "remediation":
      return t.headlineRemediation;
    case "next":
      return t.headlineNext;
    case "course_complete":
      return t.headlineComplete;
    default:
      return t.learningRecommendation;
  }
}

/** Primary-button label for the recommendation popup, by decision kind. */
export function learningDecisionAcceptLabel(decision: LearningDecision, t: CourseLabels): string {
  switch (decision.kind) {
    case "remediation":
      return t.yes;
    case "next":
      return decision.nextLessonTitle ? formatMessage(t.acceptNext, { title: decision.nextLessonTitle }) : t.acceptNextDefault;
    case "course_complete":
      return t.acceptComplete;
    default:
      return t.continueLabel;
  }
}
