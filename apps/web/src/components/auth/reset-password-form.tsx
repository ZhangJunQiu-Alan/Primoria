"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { AuthHero } from "@/components/auth/auth-form";
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
  const locked = pending || !token || Boolean(status);

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
    <div className="auth-panel">
      <AuthHero title={t.auth.signInHeroTitle} copy={t.auth.signInHeroCopy} />
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-heading">
          <div>
            <h1>{t.auth.resetPasswordTitle}</h1>
            <p>{t.auth.resetPasswordCopy}</p>
          </div>
        </div>

        <div className="auth-fields">
          <label className="auth-field">
            <span>{t.auth.newPassword}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
              disabled={locked}
            />
          </label>
          <label className="auth-field">
            <span>{t.auth.confirmNewPassword}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
              disabled={locked}
            />
          </label>
        </div>

        {error ? <p className="auth-message error" role="alert">{error}</p> : null}
        {status ? <p className="auth-message success" role="status">{status}</p> : null}

        {status ? (
          <Link className="auth-submit" href="/login">{t.auth.backToLogin}</Link>
        ) : (
          <button className="auth-submit" type="submit" disabled={locked}>
            {pending ? t.auth.passwordResetting : t.auth.resetPassword}
          </button>
        )}

        {status ? null : (
          <div className="auth-footer">
            <p className="auth-switch">
              <Link href="/login">{t.auth.backToLogin}</Link>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
