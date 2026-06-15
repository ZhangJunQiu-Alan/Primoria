"use client";

import { useEffect, useState } from "react";
import {
  createNewThread,
  ensureThreadSummary,
  getCurrentThreadId,
  readThreadHistory,
  setCurrentThreadId,
  THREAD_EVENT_NAME,
  type CopilotThreadSummary,
} from "@/lib/copilot-thread-history";

function readSessions() {
  const currentThreadId = getCurrentThreadId();
  ensureThreadSummary(currentThreadId);
  return {
    currentThreadId,
    sessions: readThreadHistory(),
  };
}

export function ChatHistoryPopup({
  open,
  onClose,
  onNewChat,
  onSelectChat,
}: {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat?: (threadId: string) => void;
}) {
  const [currentThreadId, setCurrentThread] = useState(() => getCurrentThreadId());
  const [sessions, setSessions] = useState<CopilotThreadSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      const next = readSessions();
      setCurrentThread(next.currentThreadId);
      setSessions(next.sessions);
    };
    refresh();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(THREAD_EVENT_NAME, refresh);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(THREAD_EVENT_NAME, refresh);
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasSession = sessions.length > 0;

  return (
    <div className="history-overlay" role="dialog" aria-modal="true" aria-label="Chat history">
      <button type="button" className="history-backdrop" aria-label="Close history" onClick={onClose} />
      <div className="history-panel">
        <header className="history-head">
          <strong>Chat history</strong>
          <button type="button" className="history-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <button
          type="button"
          className="history-new"
          onClick={() => {
            const threadId = createNewThread();
            onSelectChat?.(threadId);
            onNewChat();
            onClose();
          }}
        >
          <span className="history-new-plus" aria-hidden="true">+</span>
          Start a new tutor chat
        </button>

        {hasSession ? (
          <>
            <div className="history-section-title">Recent</div>
            <ul className="history-list">
              {sessions.map((session) => {
                const active = session.id === currentThreadId;
                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      className={`history-item${active ? " active" : ""}`}
                      onClick={() => {
                        setCurrentThreadId(session.id);
                        onSelectChat?.(session.id);
                        onClose();
                      }}
                    >
                      <strong>{session.title || "Tutor chat"}</strong>
                      <span>{session.messageCount} messages · {active ? "live" : new Date(session.updatedAt).toLocaleDateString()}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="history-empty">
            No conversations yet. Send your first message to start one.
          </p>
        )}

        <p className="history-hint">
          CopilotKit sessions are stored locally by thread id on this browser.
        </p>
      </div>
    </div>
  );
}
