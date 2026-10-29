"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthAlert, AuthHeading, AuthLayout, MIN_PASSWORD_LENGTH, PasswordInput, PasswordLengthHint } from "@/components/auth/auth-layout";
import { ArrowIcon } from "@/components/arrow-icon";
import { normalizeAuthRedirect } from "@/lib/auth/redirect";
import { useT } from "@/lib/i18n/client";

const SIGN_IN_HREF = "/auth/sign-in";
const SIGN_UP_HREF = "/auth/sign-up";

export function AuthForm({ mode }: { mode: "signin" | "signup" | "sign-in" | "sign-up" }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = normalizeAuthRedirect(searchParams.get("next"));

  // Normalize mode
  const normalizedMode = (mode === "signin" || mode === "sign-in") ? "sign-in" : "sign-up";
  const isSignUp = normalizedMode === "sign-up";

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? t.auth.callbackFailed : null
  );

  const switchHref = useMemo(() => {
    const destination = isSignUp ? SIGN_IN_HREF : SIGN_UP_HREF;
    return `${destination}?${new URLSearchParams({ next }).toString()}`;
  }, [isSignUp, next]);

  async function submitAppDb(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setPending(true);
    try {
      const response = await fetch(isSignUp ? "/api/auth/sign-up" : "/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, displayName: displayName || undefined }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Authentication failed");
      setStatus(isSignUp ? t.auth.accountCreatedRedirecting : t.auth.signedInRedirecting);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.authFailed);
      setPending(false);
    }
  }

  return (
    <AuthLayout plate={normalizedMode}>
      <AuthHeading
        title={isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
        subtitle={isSignUp ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
      />

      <form className="auth-form" onSubmit={submitAppDb}>
        {isSignUp ? (
          <div className="auth-field">
            <label htmlFor="auth-name">
              {t.auth.displayName} <span className="auth-optional">{t.auth.optional}</span>
            </label>
            <input
              id="auth-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ada"
              autoComplete="name"
              disabled={pending}
            />
          </div>
        ) : null}

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
            aria-invalid={Boolean(error) || undefined}
          />
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="auth-password">{t.auth.password}</label>
            {!isSignUp ? <Link href="/forgot">{t.auth.forgotPassword}</Link> : null}
          </div>
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={setPassword}
            placeholder={isSignUp ? t.auth.passwordSignupPlaceholder : t.auth.passwordSigninPlaceholder}
            minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            disabled={pending}
            describedBy={isSignUp ? "auth-password-hint" : undefined}
            invalid={Boolean(error)}
          />
          {isSignUp ? <PasswordLengthHint id="auth-password-hint" length={password.length} /> : null}
        </div>

        {error ? <AuthAlert>{error}</AuthAlert> : null}
        {status ? <p className="auth-status" role="status">{status}</p> : null}

        <button className="auth-submit" type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? (isSignUp ? t.auth.creating : t.auth.signingIn) : isSignUp ? t.auth.createAccount : t.auth.signIn}
          <ArrowIcon />
        </button>
      </form>

      <p className="auth-switch">
        {isSignUp ? t.auth.alreadyHave : t.auth.newToPrimoria}
        <Link href={switchHref}>{isSignUp ? t.auth.signIn : t.auth.createAccountLink}</Link>
      </p>
    </AuthLayout>
  );
}
