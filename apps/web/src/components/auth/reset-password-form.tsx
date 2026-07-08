"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { authStyles } from "@/components/auth/styles";
import { useT } from "@/lib/i18n/client";

export function ResetPasswordForm() {
  const t = useT();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(token ? null : t.auth.passwordResetMissingToken);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    if (!token) {
      setError(t.auth.passwordResetMissingToken);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.auth.passwordResetMismatch);
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t.auth.passwordResetFailed);
      setStatus(t.auth.passwordResetSuccess);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.passwordResetFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>{t.auth.resetPasswordTitle}</h1>
      <p style={authStyles.label}>{t.auth.resetPasswordCopy}</p>

      <form onSubmit={submit} style={authStyles.section}>
        <label style={authStyles.label} htmlFor="reset-password">{t.auth.newPassword}</label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
          disabled={pending || !token || Boolean(status)}
          style={authStyles.input}
        />
        <label style={authStyles.label} htmlFor="reset-confirm-password">{t.auth.confirmNewPassword}</label>
        <input
          id="reset-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
          disabled={pending || !token || Boolean(status)}
          style={authStyles.input}
        />
        <button type="submit" disabled={pending || !token || Boolean(status)} style={authStyles.primaryButton}>
          {pending ? t.auth.passwordResetting : t.auth.resetPassword}
        </button>
      </form>

      {error ? <p style={authStyles.error} role="alert">{error}</p> : null}
      {status ? <p style={authStyles.success} role="status">{status}</p> : null}

      <Link href="/login" style={authStyles.primaryButton}>
        {t.auth.backToLogin}
      </Link>
    </div>
  );
}
