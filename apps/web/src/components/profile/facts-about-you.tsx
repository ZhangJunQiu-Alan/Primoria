"use client";

import { useEffect, useState, useTransition } from "react";
import { msg, useT } from "@/lib/i18n/client";
import type { FactCategory } from "@/lib/learner-profile/types";

export type LearnerFactView = { id: string; text: string; category: FactCategory };

const CATEGORIES: FactCategory[] = ["preference", "prior_knowledge", "learning_gap", "interest", "goal", "profile_context"];

const EMPTY_FORM = { text: "", category: "preference" as FactCategory };

export function FactsAboutYou({ initialFacts }: { initialFacts: LearnerFactView[] }) {
  const t = useT().facts;
  const categoryLabel = (category: FactCategory) => t.categories[category] ?? category;
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
          setError(data.error ?? t.extractFailed);
        } else if (!cancelled) {
          timer = window.setTimeout(poll, 2_000);
        }
      } catch {
        if (!cancelled) {
          setError(t.extractStatusFailed);
          timer = window.setTimeout(poll, 2_000);
        }
      }
    };
    timer = window.setTimeout(poll, 2_000);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [intakeJobId, intakeStatus, t.extractFailed, t.extractStatusFailed]);

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
      setError(t.addShortFact);
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
        setError(t.saveFailed);
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
        setError(t.removeFailed);
      } finally {
        setPendingId(null);
      }
    });
  }

  function startExtraction() {
    const text = extractText.trim();
    if (text.length < 2) {
      setError(t.addShortIntro);
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
        setError(cause instanceof Error ? cause.message : t.extractStartFailed);
      }
    });
  }

  return (
    <div className="facts-manager">
      <div className="facts-composer" role="group" aria-label={t.managerAria}>
        <input
          value={form.text}
          placeholder={t.placeholder}
          onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
        />
        <div className="facts-composer-row">
          <select
            aria-label={t.categoryAria}
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as FactCategory }))}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>{categoryLabel(category)}</option>
            ))}
          </select>
          <button type="button" className="facts-primary-action" disabled={isPending} onClick={submit}>
            {editing ? t.saveFact : t.addFact}
          </button>
          <button
            type="button"
            className="facts-secondary-action"
            disabled={intakeStatus === "queued" || intakeStatus === "running"}
            title={t.extractTitle}
            onClick={() => setExtractOpen((open) => !open)}
          >
            {intakeStatus === "queued" || intakeStatus === "running" ? t.extracting : t.extract}
          </button>
        </div>
        {extractOpen ? (
          <div className="facts-extract-panel">
            <textarea
              value={extractText}
              maxLength={2_000}
              rows={5}
              placeholder={t.extractPlaceholder}
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
                {t.startExtraction}
              </button>
            </div>
          </div>
        ) : null}
        {editing ? (
          <button type="button" className="facts-cancel-edit" onClick={resetForm}>
            {msg(t.cancelEditing, { text: editing.text })}
          </button>
        ) : null}
        {error ? <p className="facts-error">{error}</p> : null}
      </div>

      <div className="facts-list-header">
        <span>{msg(facts.length === 1 ? t.factCount : t.factsCount, { count: facts.length })}</span>
        <p>{t.listCopy}</p>
      </div>

      {facts.length === 0 ? (
        <section className="facts-empty-panel">
          <strong>{t.emptyTitle}</strong>
          <p>{t.emptyCopy}</p>
        </section>
      ) : (
        <ul className="facts-list facts-list-editor">
          {facts.map((fact) => (
            <li key={fact.id} className="facts-item">
              <span className="facts-category">{categoryLabel(fact.category)}</span>
              <span className="facts-text">{fact.text}</span>
              <span className="facts-actions">
                <button type="button" aria-label={t.editFact} disabled={isPending} onClick={() => edit(fact)}>
                  {t.edit}
                </button>
                <button type="button" className="danger" aria-label={t.removeFact} disabled={pendingId === fact.id} onClick={() => remove(fact.id)}>
                  {t.delete}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
