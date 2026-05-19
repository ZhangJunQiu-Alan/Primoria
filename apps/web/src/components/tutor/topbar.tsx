export function TutorTopbar({
  onOpenSettings,
  onOpenHistory,
}: {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}) {
  return (
    <header className="topbar">
      <div className="session-title">
        <strong>AI Tutor</strong>
        <span>Interactive explanations, step-by-step help, and generated learning widgets.</span>
      </div>
      <div className="tutor-tools" aria-label="Tutor capabilities">
        <button className="tool-pill icon-pill" onClick={onOpenHistory} aria-label="Chat history">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          History
        </button>
        <button className="tool-pill" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </header>
  );
}
