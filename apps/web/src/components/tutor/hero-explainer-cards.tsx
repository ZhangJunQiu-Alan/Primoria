const cards = [
  {
    title: "Generative UI",
    description: "AI produces interactive widgets, plans, and todos inline as you ask.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
  },
  {
    title: "Interactive widgets",
    description: "Sandboxed HTML/JS visualizations stream in token by token. Drag, click, explore.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: "Visualize anything",
    description: "Ask for an algorithm walk-through, a physics simulation, or a step-by-step diagram.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
];

export function HeroExplainerCards() {
  return (
    <div className="hero-explainer-grid" aria-label="Primoria capabilities">
      {cards.map((card) => (
        <div key={card.title} className="hero-explainer-card">
          <div className="hero-explainer-head">
            <span className="hero-explainer-icon" aria-hidden="true">{card.icon}</span>
            <strong>{card.title}</strong>
          </div>
          <p>{card.description}</p>
        </div>
      ))}
    </div>
  );
}
