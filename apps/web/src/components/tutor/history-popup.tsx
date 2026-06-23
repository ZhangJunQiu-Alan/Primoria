"use client";

import { useEffect, useRef, useState } from "react";
import {
  getCurrentThreadId,
  readThreadHistory,
  setCurrentThreadId,
  THREAD_EVENT_NAME,
  type CopilotThreadSummary,
} from "@/lib/copilot-thread-history";

function readSessions() {
  const currentThreadId = getCurrentThreadId();
  return {
    currentThreadId,
    sessions: readThreadHistory().filter((session) => session.messageCount > 0),
  };
}

export function ChatHistoryPopup({
  open,
  onClose,
  onSelectChat,
}: {
  open: boolean;
  onClose: () => void;
  onSelectChat?: (threadId: string) => void;
}) {
  const [currentThreadId, setCurrentThread] = useState(getCurrentThreadId());
  const [sessions, setSessions] = useState<CopilotThreadSummary[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

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
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest("[data-history-trigger]")) return;
      if (!panelRef.current?.contains(target)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener(THREAD_EVENT_NAME, refresh);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener(THREAD_EVENT_NAME, refresh);
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasSession = sessions.length > 0;

  return (
    <div className="history-dropdown" role="dialog" aria-label="Recent chat history">
      <div className="history-panel" ref={panelRef}>
        <header className="history-head">
          <strong>Recent</strong>
          <button type="button" className="history-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {hasSession ? (
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
        ) : (
          <p className="history-empty">
            No recent conversations yet.
          </p>
        )}
      </div>
    </div>
  );
}
