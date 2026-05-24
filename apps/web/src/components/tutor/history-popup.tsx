"use client";

import { useEffect, useState } from "react";
import {
  createNewThread,
  getCurrentThreadId,
  readThreadHistory,
  setCurrentThreadId,
  THREAD_EVENT_NAME,
  type CopilotThreadSummary,
} from "@/lib/copilot-thread-history";

const CHAT_STORAGE_KEY = "primoria:tutor-chat-messages";

type StoredMessage = {
  id?: string;
  role?: string;
  content?: string;
};

function readLegacySession(): { messageCount: number; lastUserPreview: string | null } {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return { messageCount: 0, lastUserPreview: null };
    const messages = JSON.parse(raw) as StoredMessage[];
    if (!Array.isArray(messages) || messages.length === 0) {
      return { messageCount: 0, lastUserPreview: null };
    }
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const preview = lastUser?.content?.trim().slice(0, 60) ?? null;
    return { messageCount: messages.length, lastUserPreview: preview };
  } catch {
    return { messageCount: 0, lastUserPreview: null };
  }
}

function readSessions(useCopilotKit: boolean) {
  if (!useCopilotKit) {
    const legacy = readLegacySession();
    return {
      currentThreadId: "legacy-local-chat",
      sessions: legacy.messageCount > 0
        ? [{
            id: "legacy-local-chat",
            title: legacy.lastUserPreview ?? "Current tutor session",
            messageCount: legacy.messageCount,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }]
        : [],
    };
  }

  const currentThreadId = getCurrentThreadId();
  return {
    currentThreadId,
    sessions: readThreadHistory().filter((session) => session.messageCount > 0),
  };
}

export function ChatHistoryPopup({
  open,
  onClose,
  onNewChat,
  onSelectChat,
  useCopilotKit = false,
}: {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat?: (threadId: string) => void;
  useCopilotKit?: boolean;
}) {
  const [currentThreadId, setCurrentThread] = useState("legacy-local-chat");
  const [sessions, setSessions] = useState<CopilotThreadSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      const next = readSessions(useCopilotKit);
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
  }, [open, onClose, useCopilotKit]);

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
            if (useCopilotKit) {
              const threadId = createNewThread();
              onSelectChat?.(threadId);
            }
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
                        if (useCopilotKit) {
                          setCurrentThreadId(session.id);
                          onSelectChat?.(session.id);
                        }
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
          {useCopilotKit
            ? "CopilotKit sessions sync to your account and restore on this browser after sign-in."
            : "Older sessions will appear here once multi-session storage is wired up."}
        </p>
      </div>
    </div>
  );
}
