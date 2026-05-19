"use client";

type NavTab = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
};

const TABS: NavTab[] = [
  {
    id: "tutor",
    label: "AI Tutor",
    description: "Chat-first tutor with interactive widgets.",
    active: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    description: "Saved widgets and courses (soon).",
    disabled: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: "course",
    label: "Course Builder",
    description: "Plan and generate a full course (soon).",
    disabled: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 4v16" />
      </svg>
    ),
  },
];

export function TutorNavRail() {
  return (
    <aside className="nav-rail" aria-label="Primoria sections">
      <div className="nav-brand">
        <div className="brand-symbol" aria-hidden="true" />
        <span className="nav-brand-text">Primoria</span>
      </div>
      <nav className="nav-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nav-tab${tab.active ? " active" : ""}${tab.disabled ? " disabled" : ""}`}
            disabled={tab.disabled}
            title={tab.disabled ? `${tab.label} · coming soon` : tab.label}
          >
            <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="nav-tab-copy">
              <strong>{tab.label}</strong>
              <span>{tab.description}</span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
