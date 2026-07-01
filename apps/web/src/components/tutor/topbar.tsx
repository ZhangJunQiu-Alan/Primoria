"use client";

import { useT } from "@/lib/i18n/client";

export function TutorTopbar({
  onOpenHistory,
  onNewChat,
}: {
  onOpenHistory: () => void;
  onNewChat: () => void;
}) {
  const t = useT();

  return (
    <header className="topbar">
      <div className="session-title">
        <strong>{t.topbar.title}</strong>
        <span>{t.topbar.subtitle}</span>
      </div>
      <div className="tutor-tools" aria-label="Tutor capabilities">
        <button className="tool-pill icon-pill" onClick={onOpenHistory} aria-label={t.topbar.historyAria} data-history-trigger>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {t.topbar.history}
        </button>
        <button className="tool-pill icon-pill" onClick={onNewChat} aria-label={t.topbar.newChat}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          {t.topbar.newChat}
        </button>
      </div>
    </header>
  );
}
