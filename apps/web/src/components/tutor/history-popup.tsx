"use client";

import { useEffect } from "react";

type ChatSession = {
  id: string;
  title: string;
  subtitle: string;
  active?: boolean;
};

const sessions: ChatSession[] = [
  {
    id: "current",
    title: "Current tutor session",
    subtitle: "Live · OpenAI-compatible backend",
    active: true,
  },
];

export function ChatHistoryPopup({
  open,
  onClose,
  onNewChat,
}: {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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

        <div className="history-section-title">Recent</div>
        <ul className="history-list">
          {sessions.map((session) => (
            <li key={session.id}>
              <button type="button" className={`history-item${session.active ? " active" : ""}`}>
                <strong>{session.title}</strong>
                <span>{session.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="history-hint">
          Older sessions will appear here once multi-session storage is wired up.
        </p>
      </div>
    </div>
  );
}
