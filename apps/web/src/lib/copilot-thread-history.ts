export type CopilotThreadSummary = {
  id: string;
  title: string;
  preview?: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
};

export const MAIN_THREAD_STORAGE_KEY = "primoria:copilotkit:main-thread-id";
export const THREAD_HISTORY_STORAGE_KEY = "primoria:copilotkit:thread-history";
export const THREAD_EVENT_NAME = "primoria:copilotkit-thread-history-changed";

export function createThreadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `primoria-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readThreadHistory(): CopilotThreadSummary[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(THREAD_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CopilotThreadSummary[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((thread) => thread && typeof thread.id === "string")
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

export function writeThreadHistory(threads: CopilotThreadSummary[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(THREAD_HISTORY_STORAGE_KEY, JSON.stringify(threads.slice(0, 30)));
  window.dispatchEvent(new Event(THREAD_EVENT_NAME));
}

export function getCurrentThreadId() {
  if (!canUseStorage()) return "primoria-main-chat";
  const existing = window.localStorage.getItem(MAIN_THREAD_STORAGE_KEY);
  if (existing) return existing;
  const next = createThreadId();
  setCurrentThreadId(next);
  return next;
}

export function setCurrentThreadId(threadId: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MAIN_THREAD_STORAGE_KEY, threadId);
  window.dispatchEvent(new Event(THREAD_EVENT_NAME));
}

export function ensureThreadSummary(threadId: string, patch: Partial<Omit<CopilotThreadSummary, "id">> = {}) {
  const now = Date.now();
  const history = readThreadHistory();
  const existing = history.find((thread) => thread.id === threadId);
  const next: CopilotThreadSummary = {
    id: threadId,
    title: patch.title ?? existing?.title ?? "New tutor chat",
    preview: patch.preview ?? existing?.preview,
    messageCount: patch.messageCount ?? existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? patch.createdAt ?? now,
    updatedAt: patch.updatedAt ?? now,
  };
  writeThreadHistory([next, ...history.filter((thread) => thread.id !== threadId)]);
  return next;
}

export function createNewThread() {
  const threadId = createThreadId();
  setCurrentThreadId(threadId);
  ensureThreadSummary(threadId, {
    title: "New tutor chat",
    messageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return threadId;
}

export function recordThreadMessage(threadId: string, message: string) {
  const trimmed = message.trim();
  if (!trimmed) return;
  const title = trimmed.slice(0, 48);
  ensureThreadSummary(threadId, {
    title,
    preview: trimmed.slice(0, 90),
    messageCount: Math.max(1, (readThreadHistory().find((thread) => thread.id === threadId)?.messageCount ?? 0) + 1),
    updatedAt: Date.now(),
  });
}
