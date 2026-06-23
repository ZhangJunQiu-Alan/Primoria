export function TutorTopbar({
  onOpenHistory,
  onNewChat,
}: {
  onOpenHistory: () => void;
  onNewChat: () => void;
}) {
  return (
    <header className="topbar">
      <div className="session-title">
        <strong>AI Tutor</strong>
        <span>Interactive explanations, step-by-step help, and generated learning widgets.</span>
      </div>
      <div className="tutor-tools" aria-label="Tutor capabilities">
        <button className="tool-pill icon-pill" onClick={onOpenHistory} aria-label="Chat history" data-history-trigger>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          History
        </button>
        <button className="tool-pill icon-pill" onClick={onNewChat} aria-label="New chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          New Chat
        </button>
      </div>
    </header>
  );
}
