"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { AuthAlert, AuthBackLink, AuthHeading, AuthLayout, MIN_PASSWORD_LENGTH, PasswordInput, PasswordLengthHint } from "@/components/auth/auth-layout";
import { ArrowIcon } from "@/components/arrow-icon";
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
  const [mismatch, setMismatch] = useState(false);
  const locked = pending || !token || Boolean(status);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setMismatch(false);
    if (!token) {
      setError(t.auth.passwordResetMissingToken);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.auth.passwordResetMismatch);
      setMismatch(true);
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
    <AuthLayout plate="sign-in">
      <AuthBackLink />
      <AuthHeading title={t.auth.resetPasswordTitle} subtitle={t.auth.resetPasswordCopy} />

      <form className="auth-form" onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="auth-new-password">{t.auth.newPassword}</label>
          <PasswordInput
            id="auth-new-password"
            value={password}
            onChange={setPassword}
            placeholder={t.auth.passwordSignupPlaceholder}
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            disabled={locked}
            describedBy="auth-new-password-hint"
          />
          <PasswordLengthHint id="auth-new-password-hint" length={password.length} />
        </div>
        <div className="auth-field">
          <label htmlFor="auth-confirm-password">{t.auth.confirmNewPassword}</label>
          <PasswordInput
            id="auth-confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            disabled={locked}
            invalid={mismatch}
          />
        </div>

        {error ? <AuthAlert>{error}</AuthAlert> : null}
        {status ? <p className="auth-status" role="status">{status}</p> : null}

        {status ? (
          <Link className="auth-submit" href="/login">
            {t.auth.backToLogin}
            <ArrowIcon />
          </Link>
        ) : (
          <button className="auth-submit" type="submit" disabled={locked} aria-busy={pending || undefined}>
            {pending ? t.auth.passwordResetting : t.auth.resetPassword}
            <ArrowIcon />
          </button>
        )}
      </form>
    </AuthLayout>
  );
}
