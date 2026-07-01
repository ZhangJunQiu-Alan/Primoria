"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TurnstileWidget } from "@/components/auth/turnstile";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { msg, useT } from "@/lib/i18n/client";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const isSupabaseActive = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const SIGN_IN_HREF = "/auth/sign-in";
const SIGN_UP_HREF = "/auth/sign-up";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.8 12s3.3-5.6 9.2-5.6S21.2 12 21.2 12s-3.3 5.6-9.2 5.6S2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      {visible ? <path className="auth-eye-slash" d="M4.8 4.8 19.2 19.2" /> : null}
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "signin" | "signup" | "sign-in" | "sign-up" }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/library";

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);
  const passwordReady = password.length >= 8;
  const passwordHint = isSignUp
    ? password.length === 0
      ? t.auth.passwordEmptyHint
      : passwordReady
        ? t.auth.passwordGoodHint
        : msg(t.auth.passwordMoreHint, { count: 8 - password.length })
    : t.auth.passwordWorkspaceHint;
  const nextCopy = useMemo(() => {
    if (!next || next === "/library") return t.common.library;
    if (next === "/") return t.topbar.title;
    return next.replace(/^\//, "");
  }, [next, t.common.library, t.topbar.title]);

  function redirectTo() {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  function resetCaptcha() {
    if (!captchaEnabled) return;
    setCaptchaToken(null);
    setCaptchaResetKey((k) => k + 1);
  }

  function captchaOptions() {
    return captchaEnabled && captchaToken ? { captchaToken } : {};
  }

  function guardCaptcha() {
    if (captchaEnabled && !captchaToken) {
      setError(t.auth.captchaRequired);
      return false;
    }
    return true;
  }

  // Supabase Auth Flows
  async function submitSupabase(event: React.FormEvent) {
    event.preventDefault();
    if (!guardCaptcha()) return;
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const supabase = createClient();
      if (isSignUp) {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo(),
            data: { display_name: displayName || undefined },
            ...captchaOptions(),
          },
        });
        if (err) throw err;
        setStatus(t.auth.registerSuccess);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: captchaOptions(),
        });
        if (err) throw err;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(errorMessage(err, t.auth.authFailed));
      resetCaptcha();
    } finally {
      setPending(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError(t.auth.emailFirst);
      return;
    }
    if (!guardCaptcha()) return;
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo(), ...captchaOptions() },
      });
      if (err) throw err;
      setStatus(t.auth.magicLinkSent);
    } catch (err) {
      setError(errorMessage(err, t.auth.magicLinkFailed));
      resetCaptcha();
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo() },
      });
      if (err) throw err;
    } catch (err) {
      setError(errorMessage(err, t.auth.googleUnavailable));
    }
  }

  // Custom DB-Backed Auth Flows
  async function submitCustomDb(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch(isSignUp ? "/api/auth/sign-up" : "/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, displayName: displayName || undefined }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Authentication failed");
      router.push("/library");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.authFailed);
    } finally {
      setPending(false);
    }
  }

  const title = isSignUp ? t.auth.signUpTitle : t.auth.signInTitle;
  const cta = isSignUp ? t.auth.createAccount : t.auth.signIn;
  const subtitle = isSignUp ? t.auth.signUpSubtitle : t.auth.signInSubtitle;
  const heroTitle = isSignUp ? t.auth.signUpHeroTitle : t.auth.signInHeroTitle;
  const heroCopy = isSignUp ? t.auth.signUpHeroCopy : t.auth.signInHeroCopy;

  return (
    <div className="auth-panel">
      <div className="auth-hero" aria-hidden="true">
        <div className="auth-hero-copy">
          <span>{t.auth.workspace}</span>
          <strong>{heroTitle}</strong>
          <p>{heroCopy}</p>
          <ul className="auth-hero-list">
            {t.auth.benefits.map((item) => (
              <li key={item}><span />{item}</li>
            ))}
          </ul>
        </div>
        <div className="auth-hero-orbits">
          <i />
          <i />
          <i />
        </div>
      </div>

      <form className="auth-card" onSubmit={isSupabaseActive ? submitSupabase : submitCustomDb}>
        <div className="auth-heading">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <LanguageSwitcher className="auth-language-switcher" />
        </div>

        {isSupabaseActive && (
          <>
            <button type="button" onClick={handleGoogle} disabled={pending} className="auth-secondary-action">
              <span className="auth-provider-mark" aria-hidden="true">G</span>
              <span>{t.auth.google}</span>
            </button>
            <div className="auth-divider"><span>{t.auth.emailDivider}</span></div>
          </>
        )}

        <div className="auth-fields">
          {isSignUp ? (
            <label className="auth-field">
              <span>{t.auth.displayName}</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ada"
                autoComplete="name"
                disabled={pending}
              />
            </label>
          ) : (
            <div className="auth-field auth-field-spacer" aria-hidden="true" />
          )}

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
              aria-invalid={Boolean(error)}
            />
          </label>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="auth-password">{t.auth.password}</label>
              {!isSignUp && isSupabaseActive ? <Link href="/forgot">{t.auth.forgotPassword}</Link> : null}
            </div>
            <div className="auth-password-control">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignUp ? t.auth.passwordSignupPlaceholder : t.auth.passwordSigninPlaceholder}
                minLength={isSignUp ? 8 : undefined}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                disabled={pending}
                aria-describedby="auth-password-hint"
                aria-invalid={isSignUp && password.length > 0 && !passwordReady}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={pending || password.length === 0}
                aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
              >
                <PasswordVisibilityIcon visible={showPassword} />
              </button>
            </div>
            <p id="auth-password-hint" className={isSignUp && password.length > 0 && !passwordReady ? "auth-field-hint warning" : "auth-field-hint"}>
              {passwordHint}
            </p>
          </div>
        </div>

        {isSupabaseActive && captchaEnabled && TURNSTILE_SITE_KEY ? (
          <div className="auth-captcha">
            <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} resetKey={captchaResetKey} />
          </div>
        ) : null}

        {error ? <p className="auth-message error" role="alert">{error}</p> : null}
        {status ? <p className="auth-message success" role="status">{status}</p> : null}

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? (isSignUp ? t.auth.creating : t.auth.signingIn) : cta}
        </button>

        {isSupabaseActive && (
          <button type="button" onClick={handleMagicLink} disabled={pending || !email} className="auth-link-action">
            {t.auth.sendMagicLink}
          </button>
        )}

        <div className="auth-footer">
          <p>{t.auth.afterSuccess} <strong>{nextCopy}</strong>.</p>
          <p className="auth-switch">
            {isSignUp ? t.auth.alreadyHave : t.auth.newToPrimoria}{" "}
            <Link href={isSignUp ? SIGN_IN_HREF : SIGN_UP_HREF}>
              {isSignUp ? t.auth.signIn : t.auth.createAccount}
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
