"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

import { AuthHero } from "@/components/auth/auth-form";
import { useT } from "@/lib/i18n/client";

export function ForgotForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? t.auth.passwordResetRequestFailed);
      setStatus(t.auth.passwordResetRequestSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.passwordResetRequestFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-panel">
      <AuthHero title={t.auth.signInHeroTitle} copy={t.auth.signInHeroCopy} />
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-heading">
          <div>
            <h1>{t.auth.forgotPasswordTitle}</h1>
            <p>{t.auth.forgotPasswordCopy}</p>
          </div>
        </div>

        <div className="auth-fields">
          <label className="auth-field">
            <span>{t.auth.email}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              required
              disabled={pending}
            />
          </label>
        </div>

        {error ? <p className="auth-message error" role="alert">{error}</p> : null}
        {status ? <p className="auth-message success" role="status">{status}</p> : null}

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? t.auth.passwordResetSending : t.auth.sendPasswordResetEmail}
        </button>

        <div className="auth-footer">
          <p className="auth-switch">
            <Link href="/login">{t.auth.backToLogin}</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
