const tools = ["Explain", "Visualize", "Practice", "Code"];

export function TutorTopbar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <header className="topbar">
      <div className="session-title">
        <strong>AI Tutor</strong>
        <span>Interactive explanations, step-by-step help, and generated learning widgets.</span>
      </div>
      <div className="tutor-tools" aria-label="Tutor capabilities">
        {tools.map((tool, index) => (
          <button key={tool} className={index === 0 ? "tool-pill active" : "tool-pill"}>
            {tool}
          </button>
        ))}
        <button className="tool-pill" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </header>
  );
}
