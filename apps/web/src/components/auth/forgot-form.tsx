"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { AuthAlert, AuthBackLink, AuthHeading, AuthLayout } from "@/components/auth/auth-layout";
import { ArrowIcon } from "@/components/arrow-icon";
import { useT } from "@/lib/i18n/client";

export function ForgotForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? t.auth.passwordResetRequestFailed);
      setSentTo(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.passwordResetRequestFailed);
    } finally {
      setPending(false);
    }
  }

  const [sentBefore, sentAfter] = t.auth.resetEmailSentBody.split("{email}");

  return (
    <AuthLayout plate="sign-in">
      <AuthBackLink />
      <AuthHeading title={t.auth.forgotPasswordTitle} subtitle={t.auth.forgotPasswordCopy} />

      {sentTo ? (
        <div className="auth-sent" role="status">
          <span className="auth-kicker">{t.auth.resetEmailSentKicker}</span>
          <strong>{t.auth.resetEmailSentTitle}</strong>
          <p>{sentBefore}<b>{sentTo}</b>{sentAfter}</p>
          <button type="button" onClick={() => setSentTo(null)}>{t.auth.resetEmailRetry}</button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="auth-email">{t.auth.email}</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              required
              disabled={pending}
            />
          </div>

          {error ? <AuthAlert>{error}</AuthAlert> : null}

          <button className="auth-submit" type="submit" disabled={pending} aria-busy={pending || undefined}>
            {pending ? t.auth.passwordResetSending : t.auth.sendPasswordResetEmail}
            <ArrowIcon />
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
