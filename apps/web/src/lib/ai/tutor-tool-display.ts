import type { I18nDictionary } from "@/lib/i18n/dictionaries";

const EXECUTING_STATUSES = new Set(["inprogress", "executing", "running", "loading", "pending", "generating"]);
const FAILED_STATUS_PATTERN = /fail|error|timeout|cancel/i;

export function getTutorToolDisplay(name: string, status: string, t: I18nDictionary) {
  const toolStatus = t.tutor.toolStatus as Record<string, string>;
  const toolCompleteStatus = t.tutor.toolCompleteStatus as Record<string, string>;
  const action = toolStatus[name] ?? toolStatus.default;
  if (isTutorToolFailedStatus(status)) {
    return { title: t.tutor.toolFailed, detail: action };
  }
  if (status === "complete") {
    return { title: toolCompleteStatus[name] ?? toolCompleteStatus.default ?? t.tutor.toolComplete, detail: action };
  }
  return { title: action, detail: action };
}

export function getTutorToolIndicatorClass(status: string) {
  if (isTutorToolExecutingStatus(status)) {
    return "tool-spinner";
  }
  if (isTutorToolFailedStatus(status)) {
    return "tool-dot tool-dot-failed";
  }
  return "tool-dot";
}

function isTutorToolExecutingStatus(status: string) {
  return EXECUTING_STATUSES.has(status.toLowerCase());
}

function isTutorToolFailedStatus(status: string) {
  return FAILED_STATUS_PATTERN.test(status);
}
