"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

import { authStyles } from "@/components/auth/styles";
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
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>{t.auth.forgotPasswordTitle}</h1>
      <p style={authStyles.label}>{t.auth.forgotPasswordCopy}</p>

      <form onSubmit={submit} style={authStyles.section}>
        <label style={authStyles.label} htmlFor="forgot-email">{t.auth.email}</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          required
          disabled={pending}
          style={authStyles.input}
        />
        <button type="submit" disabled={pending} style={authStyles.primaryButton}>
          {pending ? t.auth.passwordResetSending : t.auth.sendPasswordResetEmail}
        </button>
      </form>

      {error ? <p style={authStyles.error} role="alert">{error}</p> : null}
      {status ? <p style={authStyles.success} role="status">{status}</p> : null}

      <p style={authStyles.footer}>
        <Link href="/login">{t.auth.backToLogin}</Link>
      </p>
    </div>
  );
}
