"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TurnstileWidget } from "@/components/auth/turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const isSupabaseActive = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const SIGN_IN_HREF = "/auth/sign-in";
const SIGN_UP_HREF = "/auth/sign-up";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function AuthForm({ mode }: { mode: "signin" | "signup" | "sign-in" | "sign-up" }) {
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
    searchParams.get("error") ? "Authentication callback failed. Please try again." : null
  );
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);
  const passwordReady = password.length >= 8;
  const passwordHint = isSignUp
    ? password.length === 0
      ? "Use at least 8 characters."
      : passwordReady
        ? "Password length looks good."
        : `${8 - password.length} more character${8 - password.length === 1 ? "" : "s"} needed.`
    : "Use the password for this workspace.";
  const nextCopy = useMemo(() => {
    if (!next || next === "/library") return "Library";
    if (next === "/") return "Tutor";
    return next.replace(/^\//, "");
  }, [next]);

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
      setError("Please complete the Turnstile captcha first.");
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
        setStatus("Registration successful! Please check your email for the verification link.");
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
      setError(errorMessage(err, "Authentication failed."));
      resetCaptcha();
    } finally {
      setPending(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Please enter your email first.");
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
      setStatus("Magic link sent! Please check your email inbox.");
    } catch (err) {
      setError(errorMessage(err, "Failed to send magic link."));
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
      setError(errorMessage(err, "Google login is currently unavailable."));
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
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  }

  const title = isSignUp ? "Create your workspace" : "Sign in to your workspace";
  const cta = isSignUp ? "Create account" : "Sign in";
  const subtitle = isSignUp
    ? "Start with a private learning record, saved courses, and workspace history."
    : "Continue with your saved Library, active builds, and tutor history.";
  const heroTitle = isSignUp ? "Build from a clean learning record" : "Welcome back";
  const heroCopy = isSignUp
    ? "Your courses, progress, chat history, and generated workspace artifacts stay attached to one account."
    : "Pick up active courses, generated lessons, workspace agents, and chat context without rebuilding your setup.";

  return (
    <div className="auth-panel">
      <div className="auth-hero" aria-hidden="true">
        <div className="auth-hero-copy">
          <span>Primoria workspace</span>
          <strong>{heroTitle}</strong>
          <p>{heroCopy}</p>
          <ul className="auth-hero-list">
            <li><span />Saved courses and lessons</li>
            <li><span />Tutor chat continuity</li>
            <li><span />Workspace artifacts and progress</li>
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
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {isSupabaseActive && (
          <>
            <button type="button" onClick={handleGoogle} disabled={pending} className="auth-secondary-action">
              <span className="auth-provider-mark" aria-hidden="true">G</span>
              <span>Continue with Google</span>
            </button>
            <div className="auth-divider"><span>or use email</span></div>
          </>
        )}

        <div className="auth-fields">
          {isSignUp ? (
            <label className="auth-field">
              <span>Display name</span>
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
            <span>Email</span>
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
              <label htmlFor="auth-password">Password</label>
              {!isSignUp && isSupabaseActive ? <Link href="/forgot">Forgot password?</Link> : null}
            </div>
            <div className="auth-password-control">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignUp ? "At least 8 characters" : "Your password"}
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
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
          {pending ? (isSignUp ? "Creating account…" : "Signing in…") : cta}
        </button>

        {isSupabaseActive && (
          <button type="button" onClick={handleMagicLink} disabled={pending || !email} className="auth-link-action">
            Send email magic link
          </button>
        )}

        <div className="auth-footer">
          <p>After success, you’ll continue to <strong>{nextCopy}</strong>.</p>
          <p className="auth-switch">
            {isSignUp ? "Already have an account?" : "New to Primoria?"}{" "}
            <Link href={isSignUp ? SIGN_IN_HREF : SIGN_UP_HREF}>
              {isSignUp ? "Sign in" : "Create account"}
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
