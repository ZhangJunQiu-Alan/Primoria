"use client";

import { useEffect, useState, useTransition } from "react";
import type { FactCategory } from "@/lib/learner-profile/types";

export type LearnerFactView = { id: string; text: string; category: FactCategory };

const CATEGORY_OPTIONS: Array<{ value: FactCategory; label: string }> = [
  { value: "preference", label: "Learning preference" },
  { value: "prior_knowledge", label: "Background" },
  { value: "learning_gap", label: "Learning gap" },
  { value: "interest", label: "Interest" },
  { value: "goal", label: "Goal" },
  { value: "profile_context", label: "Other context" },
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
  const [extractOpen, setExtractOpen] = useState(false);
  const [extractText, setExtractText] = useState("");
  const [intakeJobId, setIntakeJobId] = useState<string | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<"queued" | "running" | "completed" | "failed" | null>(null);
  const [isPending, startTransition] = useTransition();
  const editing = editingId ? facts.find((fact) => fact.id === editingId) : null;

  useEffect(() => {
    if (!intakeJobId || (intakeStatus !== "queued" && intakeStatus !== "running")) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const response = await fetch(`/api/learner-facts/intake?jobId=${encodeURIComponent(intakeJobId)}`, { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as {
          status?: "queued" | "running" | "completed" | "failed";
          error?: string | null;
        };
        if (!response.ok) throw new Error(data.error ?? "status failed");
        if (cancelled || !data.status) return;
        setIntakeStatus(data.status);
        if (data.status === "completed") {
          const factsResponse = await fetch("/api/learner-facts", { cache: "no-store" });
          const factsData = (await factsResponse.json().catch(() => ({}))) as { facts?: LearnerFactView[] };
          if (!factsResponse.ok) throw new Error("facts refresh failed");
          if (!cancelled) {
            setFacts(factsData.facts ?? []);
            setExtractText("");
            setExtractOpen(false);
          }
        } else if (data.status === "failed") {
          setError(data.error ?? "Could not extract facts from that text.");
        } else if (!cancelled) {
          timer = window.setTimeout(poll, 2_000);
        }
      } catch {
        if (!cancelled) {
          setError("Could not check fact extraction status.");
          timer = window.setTimeout(poll, 2_000);
        }
      }
    };
    timer = window.setTimeout(poll, 2_000);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [intakeJobId, intakeStatus]);

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

  function startExtraction() {
    const text = extractText.trim();
    if (text.length < 2) {
      setError("Add a short introduction first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/learner-facts/intake", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          jobId?: string;
          status?: "queued" | "running";
          error?: string;
        };
        if (!response.ok || !data.jobId || !data.status) throw new Error(data.error ?? "start failed");
        setIntakeJobId(data.jobId);
        setIntakeStatus(data.status);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not start fact extraction.");
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
          <button
            type="button"
            className="facts-secondary-action"
            disabled={intakeStatus === "queued" || intakeStatus === "running"}
            onClick={() => setExtractOpen((open) => !open)}
          >
            {intakeStatus === "queued" || intakeStatus === "running" ? "Extracting…" : "Extract from text"}
          </button>
        </div>
        {extractOpen ? (
          <div className="facts-extract-panel">
            <textarea
              value={extractText}
              maxLength={2_000}
              rows={5}
              placeholder="Describe your studies, interests, goals, or learning preferences. Primoria will organize useful facts in the background."
              onChange={(event) => setExtractText(event.target.value)}
            />
            <div className="facts-extract-actions">
              <span>{extractText.length}/2000</span>
              <button
                type="button"
                className="facts-primary-action"
                disabled={isPending || extractText.trim().length < 2}
                onClick={startExtraction}
              >
                Start extraction
              </button>
            </div>
          </div>
        ) : null}
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
