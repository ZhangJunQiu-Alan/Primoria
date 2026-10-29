"use client";

import { useId, useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { CourseIntakeView, IntakeAnswers } from "@/lib/courses/course-intake";

export function CourseIntakeForm({ intake, onComplete }: { intake: CourseIntakeView; onComplete: (intake: CourseIntakeView) => void }) {
  const t = useT().tutor.intake;
  const id = useId();
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const complete = intake.questions.every((q) => answers[q.id]?.option !== undefined);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!complete || saving) return;
    setSaving(true);
    setError(false);
    try {
      const response = await fetch("/api/learning/intake", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: intake.id, answers }) });
      if (!response.ok) throw new Error("intake_submit_failed");
      onComplete(await response.json());
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return <form className="course-intake-form" onSubmit={submit} aria-busy={saving}>
    <h3>{t.title}</h3>
    <p>{t.description}</p>
    {intake.questions.map((q, index) => <fieldset key={q.id} disabled={saving}>
      <legend>{index + 1}. {q.question}</legend>
      <div className="course-intake-options">{q.options.map((option, optionIndex) => <label key={optionIndex}>
        <input type="radio" name={`${id}-${q.id}`} value={optionIndex} checked={answers[q.id]?.option === optionIndex} onChange={() => setAnswers((previous) => ({ ...previous, [q.id]: { option: optionIndex, detail: previous[q.id]?.detail ?? "" } }))} />
        <span>{option}</span>
      </label>)}</div>
      <label className="course-intake-detail">{t.detail}<input type="text" maxLength={500} value={answers[q.id]?.detail ?? ""} disabled={answers[q.id]?.option === undefined} onChange={(event) => setAnswers((previous) => ({ ...previous, [q.id]: { ...previous[q.id], detail: event.target.value } }))} /></label>
    </fieldset>)}
    {error ? <p role="alert">{t.error}</p> : null}
    <button className="ghost-btn" type="submit" disabled={!complete || saving}>{saving ? t.saving : t.submit}</button>
  </form>;
}
