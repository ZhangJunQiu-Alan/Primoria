"use client";

import { useEffect, useState } from "react";

const CHAT_STORAGE_KEY = "primoria:tutor-chat-messages";

type StoredMessage = {
  id?: string;
  role?: string;
  content?: string;
};

function readSession(): { messageCount: number; lastUserPreview: string | null } {
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

export function ChatHistoryPopup({
  open,
  onClose,
  onNewChat,
}: {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
}) {
  const [session, setSession] = useState<{ messageCount: number; lastUserPreview: string | null }>({
    messageCount: 0,
    lastUserPreview: null,
  });

  useEffect(() => {
    if (!open) return;
    setSession(readSession());
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasSession = session.messageCount > 0;

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
              <li>
                <button type="button" className="history-item active">
                  <strong>{session.lastUserPreview ?? "Current tutor session"}</strong>
                  <span>{session.messageCount} messages · live</span>
                </button>
              </li>
            </ul>
          </>
        ) : (
          <p className="history-empty">
            No conversations yet. Send your first message to start one.
          </p>
        )}

        <p className="history-hint">
          Older sessions will appear here once multi-session storage is wired up.
        </p>
      </div>
    </div>
  );
}
