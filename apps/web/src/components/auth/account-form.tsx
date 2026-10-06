"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";

type Feedback = { kind: "error" | "success"; text: string } | null;

export function AccountForm({ initialDisplayName }: { initialDisplayName: string }) {
  const t = useT();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? t.account.saveFailed);
      setFeedback({ kind: "success", text: t.account.saveSuccess });
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error && err.message ? err.message : t.account.saveFailed });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={saveProfile} className="account-form">
        <label className="profile-form-field">
          <span>{t.account.displayNameLabel}</span>
          <input
            type="text"
            placeholder={t.account.displayNamePlaceholder}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
            autoComplete="nickname"
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? t.account.saving : t.account.save}
        </button>
      </form>
      {feedback ? (
        <p className={`account-message ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p>
      ) : null}
    </>
  );
}
