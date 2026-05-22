"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import "@copilotkit/react-ui/v2/styles.css";
import { useEffect, useState, type ReactNode } from "react";

const MAIN_THREAD_STORAGE_KEY = "primoria:copilotkit:main-thread-id";

function createUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `primoria-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getMainThreadId() {
  if (typeof window === "undefined") return "primoria-main-chat";
  const existing = window.localStorage.getItem(MAIN_THREAD_STORAGE_KEY);
  if (existing) return existing;
  const next = createUuid();
  window.localStorage.setItem(MAIN_THREAD_STORAGE_KEY, next);
  return next;
}

export function CopilotKitProvider({ children }: { children: ReactNode }) {
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    setThreadId(getMainThreadId());
  }, []);

  if (!threadId) return null;

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="primoria_tutor" threadId={threadId}>
      {children}
    </CopilotKit>
  );
}
