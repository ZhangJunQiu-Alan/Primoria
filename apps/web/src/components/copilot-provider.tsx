"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import "@copilotkit/react-ui/v2/styles.css";
import { useEffect, useState, type ReactNode } from "react";
import { getCurrentThreadId, THREAD_EVENT_NAME } from "@/lib/copilot-thread-history";

export function CopilotKitProvider({ children }: { children: ReactNode }) {
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    setThreadId(getCurrentThreadId());
    function onThreadChanged() {
      setThreadId(getCurrentThreadId());
    }
    window.addEventListener(THREAD_EVENT_NAME, onThreadChanged);
    return () => window.removeEventListener(THREAD_EVENT_NAME, onThreadChanged);
  }, []);

  if (!threadId) return null;

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="primoria_tutor" threadId={threadId}>
      {children}
    </CopilotKit>
  );
}
