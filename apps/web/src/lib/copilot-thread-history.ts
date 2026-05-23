export type CopilotThreadSummary = {
  id: string;
  title: string;
  preview?: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
};

export type CopilotStoredMessage = {
  id: string;
  role: string;
  content: string;
  metadata?: unknown;
  createdAt: number;
};

export const MAIN_THREAD_STORAGE_KEY = "primoria:copilotkit:main-thread-id";
export const THREAD_HISTORY_STORAGE_KEY = "primoria:copilotkit:thread-history";
export const THREAD_EVENT_NAME = "primoria:copilotkit-thread-history-changed";
export const THREAD_RUNTIME_STORAGE_KEY = "primoria:copilotkit:runtime-session-id";

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

export function getRuntimeSessionId() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_COPILOTKIT_SESSION_ID) {
    return process.env.NEXT_PUBLIC_COPILOTKIT_SESSION_ID;
  }
  return "dev";
}

function resetThreadsForRuntimeIfNeeded() {
  if (!canUseStorage()) return;
  const runtimeId = getRuntimeSessionId();
  const existing = window.localStorage.getItem(THREAD_RUNTIME_STORAGE_KEY);
  if (existing === runtimeId) return;
  window.localStorage.setItem(THREAD_RUNTIME_STORAGE_KEY, runtimeId);
  window.localStorage.removeItem(MAIN_THREAD_STORAGE_KEY);
  window.localStorage.removeItem(THREAD_HISTORY_STORAGE_KEY);
}

export function clearCopilotThreadStorage() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(MAIN_THREAD_STORAGE_KEY);
  window.localStorage.removeItem(THREAD_HISTORY_STORAGE_KEY);
}

export function resetCopilotThreads() {
  if (!canUseStorage()) return createThreadId();
  clearCopilotThreadStorage();
  const threadId = createThreadId();
  setCurrentThreadId(threadId);
  return threadId;
}

export function getCurrentThreadId() {
  if (!canUseStorage()) return "primoria-main-chat";
  resetThreadsForRuntimeIfNeeded();
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


export async function hydrateThreadHistoryFromServer() {
  if (!canUseStorage()) return;
  try {
    const response = await fetch("/api/copilot-threads", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { threads?: CopilotThreadSummary[] };
    if (!Array.isArray(data.threads)) return;
    if (data.threads.length === 0) {
      clearCopilotThreadStorage();
      return;
    }
    const currentThreadId = window.localStorage.getItem(MAIN_THREAD_STORAGE_KEY);
    const localCurrent = currentThreadId ? readThreadHistory().find((thread) => thread.id === currentThreadId) : null;
    const preferredThread = data.threads.find((thread) => thread.messageCount > 0) ?? data.threads[0];
    writeThreadHistory(data.threads);
    const currentExistsOnServer = currentThreadId ? data.threads.some((thread) => thread.id === currentThreadId) : false;
    const currentIsEmptyPlaceholder = !localCurrent || localCurrent.messageCount === 0;
    if (!currentThreadId || (!currentExistsOnServer && currentIsEmptyPlaceholder) || (currentIsEmptyPlaceholder && preferredThread.messageCount > 0)) {
      setCurrentThreadId(preferredThread.id);
    }
  } catch {
    // Local-only mode or unauthenticated users can ignore this.
  }
}

export async function hydrateThreadMessagesFromServer(threadId: string): Promise<CopilotStoredMessage[]> {
  try {
    const response = await fetch(`/api/copilot-threads/${encodeURIComponent(threadId)}/messages`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { messages?: CopilotStoredMessage[] };
    return Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

export async function persistThreadSummaryToServer(summary: CopilotThreadSummary) {
  try {
    await fetch("/api/copilot-threads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(summary),
    });
  } catch {
    // Best-effort sync only.
  }
}

export async function persistThreadMessageToServer(
  threadId: string,
  message: { id: string; role: string; content: string; metadata?: unknown; createdAt?: number },
) {
  try {
    await fetch(`/api/copilot-threads/${encodeURIComponent(threadId)}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message),
    });
  } catch {
    // Best-effort sync only.
  }
}
