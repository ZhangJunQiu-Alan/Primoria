import type { LessonGenerationJobSummary } from "./lesson-generation-jobs";

// Single source of truth for lesson-generation stage labels (engineering doc
// §13.2). Pure + client-safe: only a TYPE is imported from the store module, so
// no server-only code is pulled into the client bundle.

type StageView = Pick<LessonGenerationJobSummary, "stage" | "progressCompleted" | "progressTotal">;

export function lessonGenerationStageLabel(job: StageView): string {
  switch (job.stage) {
    case "queued":
      return "Waiting to generate";
    case "planning":
      return "Planning lesson";
    case "writing":
      return `Writing blocks ${job.progressCompleted}/${Math.max(job.progressTotal, 1)}`;
    case "validating":
      return "Checking lesson quality";
    case "saving":
      return "Saving lesson";
    case "completed":
      return "Ready";
    case "failed":
      return "Generation failed";
    default:
      return "Generating";
  }
}

export function isLessonGenerationActive(job: Pick<LessonGenerationJobSummary, "status">): boolean {
  return job.status === "queued" || job.status === "running";
}
