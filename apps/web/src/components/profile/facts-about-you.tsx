"use client";

import { useState } from "react";

export type LearnerFactView = { id: string; text: string; category: string };

const CATEGORY_LABEL: Record<string, string> = {
  preference: "Preference",
  prior_knowledge: "Background",
  learning_gap: "To work on",
  goal: "Goal",
};

export function FactsAboutYou({ initialFacts }: { initialFacts: LearnerFactView[] }) {
  const [facts, setFacts] = useState(initialFacts);
  const [pending, setPending] = useState<string | null>(null);

  async function remove(id: string) {
    setPending(id);
    const previous = facts;
    setFacts((current) => current.filter((f) => f.id !== id)); // optimistic
    try {
      const res = await fetch("/api/learner-facts", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ factId: id }),
      });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setFacts(previous); // restore on failure
    } finally {
      setPending(null);
    }
  }

  if (facts.length === 0) {
    return <p className="facts-empty">Primoria hasn’t learned anything specific yet. As you study, facts that personalize your lessons will appear here.</p>;
  }

  return (
    <ul className="facts-list">
      {facts.map((fact) => (
        <li key={fact.id} className="facts-item">
          <span className="facts-category">{CATEGORY_LABEL[fact.category] ?? fact.category}</span>
          <span className="facts-text">{fact.text}</span>
          <button
            type="button"
            className="facts-remove"
            aria-label="Remove this fact"
            disabled={pending === fact.id}
            onClick={() => remove(fact.id)}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
