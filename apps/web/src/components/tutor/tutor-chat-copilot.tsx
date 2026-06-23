"use client";

import { useEffect, useState } from "react";
import { RestoredLessonGenerationCards, usePrimoriaGenerativeUI } from "@/hooks/use-primoria-copilot";
import { getCurrentThreadId, hydrateThreadHistoryFromServer, resetCopilotThreads, THREAD_EVENT_NAME } from "@/lib/copilot-thread-history";
import { CopilotRestorePanel, PRIMORIA_MAIN_SUGGESTIONS, PrimoriaCopilotChatSurface } from "./copilot-chat-surface";

function useCurrentCopilotThreadId() {
  const [threadId, setThreadId] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setThreadId(getCurrentThreadId());
      setIsReady(true);
      void hydrateThreadHistoryFromServer();
    }, 0);

    function onThreadChanged() {
      setThreadId(getCurrentThreadId());
      setIsReady(true);
    }
    window.addEventListener(THREAD_EVENT_NAME, onThreadChanged);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener(THREAD_EVENT_NAME, onThreadChanged);
    };
  }, []);

  return { threadId, isReady: isReady && Boolean(threadId) };
}

export function TutorChatCopilot() {
  usePrimoriaGenerativeUI();
  const { threadId, isReady } = useCurrentCopilotThreadId();

  useEffect(() => {
    function onCopilotRunError(event: ErrorEvent) {
      const message = String(event.message || "");
      if (/Message not found|INCOMPLETE_STREAM|already errored/i.test(message)) {
        resetCopilotThreads();
      }
    }
    window.addEventListener("error", onCopilotRunError);
    return () => window.removeEventListener("error", onCopilotRunError);
  }, []);

  return (
    <div className="copilot-chat-shell" aria-busy={!isReady}>
      {isReady ? (
        <>
          <RestoredLessonGenerationCards />
          <PrimoriaCopilotChatSurface
            key={`restore-${threadId}`}
            threadId={threadId}
            className="main-copilot-surface"
            welcomeScreen
            suggestions={PRIMORIA_MAIN_SUGGESTIONS}
          />
        </>
      ) : (
        <CopilotRestorePanel />
      )}
    </div>
  );
}
