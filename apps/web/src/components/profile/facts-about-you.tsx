"use client";

import { useState, useTransition } from "react";
import type { FactCategory } from "@/lib/learner-profile/types";

export type LearnerFactView = { id: string; text: string; category: FactCategory };

const CATEGORY_OPTIONS: Array<{ value: FactCategory; label: string }> = [
  { value: "preference", label: "Learning preference" },
  { value: "prior_knowledge", label: "Background" },
  { value: "learning_gap", label: "Learning gap" },
  { value: "goal", label: "Goal" },
];

const EMPTY_FORM = { text: "", category: "preference" as FactCategory };

function categoryLabel(category: FactCategory) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category;
}

export function FactsAboutYou({ initialFacts }: { initialFacts: LearnerFactView[] }) {
  const [facts, setFacts] = useState(initialFacts);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const editing = editingId ? facts.find((fact) => fact.id === editingId) : null;

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function edit(fact: LearnerFactView) {
    setEditingId(fact.id);
    setForm({ text: fact.text, category: fact.category });
    setError(null);
  }

  function submit() {
    const text = form.text.trim();
    if (text.length < 2) {
      setError("Add a short fact first.");
      return;
    }
    setError(null);
    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { factId: editingId, text, category: form.category } : { text, category: form.category };
    startTransition(async () => {
      try {
        const res = await fetch("/api/learner-facts", {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("save failed");
        const data = (await res.json()) as { fact?: LearnerFactView | null };
        if (data.fact) {
          setFacts((current) => {
            const without = current.filter((fact) => fact.id !== data.fact!.id);
            return [data.fact!, ...without];
          });
        }
        resetForm();
      } catch {
        setError("Could not save this fact.");
      }
    });
  }

  function remove(id: string) {
    setPendingId(id);
    const previous = facts;
    setFacts((current) => current.filter((fact) => fact.id !== id));
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/learner-facts", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ factId: id }),
        });
        if (!res.ok) throw new Error("delete failed");
        if (editingId === id) resetForm();
      } catch {
        setFacts(previous);
        setError("Could not remove this fact.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="facts-manager">
      <div className="facts-composer" aria-label="Add or edit facts about you">
        <input
          value={form.text}
          placeholder="e.g., Learns best with analogies before formulas"
          onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
        />
        <div className="facts-composer-row">
          <select
            aria-label="Fact category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as FactCategory }))}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" className="facts-primary-action" disabled={isPending} onClick={submit}>
            <span aria-hidden="true">{editing ? "✓" : "+"}</span>
            {editing ? "Save fact" : "Add fact"}
          </button>
          <button type="button" className="facts-secondary-action" disabled title="Extractor import will use the learner-facts distiller in a later pass">
            Extract from text
          </button>
        </div>
        {editing ? (
          <button type="button" className="facts-cancel-edit" onClick={resetForm}>
            Cancel editing “{editing.text}”
          </button>
        ) : null}
        {error ? <p className="facts-error">{error}</p> : null}
      </div>

      <div className="facts-list-header">
        <span>{facts.length} {facts.length === 1 ? "fact" : "facts"}</span>
        <p>These notes personalize future lessons and Tutor answers. Remove anything inaccurate.</p>
      </div>

      {facts.length === 0 ? (
        <section className="facts-empty-panel">
          <strong>No saved facts yet.</strong>
          <p>Add a useful preference, background detail, or goal so Primoria can teach with better context.</p>
        </section>
      ) : (
        <ul className="facts-list facts-list-editor">
          {facts.map((fact) => (
            <li key={fact.id} className="facts-item">
              <span className="facts-category">{categoryLabel(fact.category)}</span>
              <span className="facts-text">{fact.text}</span>
              <span className="facts-actions">
                <button type="button" aria-label="Edit this fact" disabled={isPending} onClick={() => edit(fact)}>
                  Edit
                </button>
                <button type="button" aria-label="Remove this fact" disabled={pendingId === fact.id} onClick={() => remove(fact.id)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
