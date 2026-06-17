"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TurnstileWidget } from "@/components/auth/turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const isSupabaseActive = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

  const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);

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

  return (
    <div className="auth-panel">
      <div className="auth-hero" aria-hidden="true">
        <span>Postgres workspace</span>
        <strong>{isSignUp ? "Start with saved memory" : "Welcome back"}</strong>
        <p>Courses, CopilotKit threads, provider settings, and generated apps stay under your account.</p>
        <div className="auth-hero-orbits">
          <i />
          <i />
          <i />
        </div>
      </div>

      <form className="auth-card" onSubmit={isSupabaseActive ? submitSupabase : submitCustomDb}>
        <div className="auth-heading">
          <span className="course-block-tag">Primoria account</span>
          <h1>{title}</h1>
          <p>
            {isSignUp
              ? "One account keeps every generated course and learning app cleanly separated."
              : "Continue learning with your saved Library, chat history, and AI settings."}
          </p>
        </div>

        {isSupabaseActive && (
          <button type="button" onClick={handleGoogle} disabled={pending} className="auth-submit" style={{ background: "#fff", color: "#111", border: "1px solid #eadfce", marginBottom: 12 }}>
            Continue with Google
          </button>
        )}

        {isSignUp ? (
          <label className="auth-field">
            <span>Name</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ada" disabled={pending} />
          </label>
        ) : null}

        <label className="auth-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required disabled={pending} />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isSignUp ? "At least 8 characters" : "Your password"}
            minLength={isSignUp ? 8 : undefined}
            required
            disabled={pending}
          />
        </label>

        {isSupabaseActive && captchaEnabled && TURNSTILE_SITE_KEY ? (
          <div style={{ marginTop: 8 }}>
            <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} resetKey={captchaResetKey} />
          </div>
        ) : null}

        {error ? <p className="auth-error">{error}</p> : null}
        {status ? <p className="auth-error" style={{ color: "#27713a", borderColor: "#cce6d2" }}>{status}</p> : null}

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? "Working…" : cta}
        </button>

        {isSupabaseActive && (
          <button type="button" onClick={handleMagicLink} disabled={pending} className="auth-submit" style={{ background: "transparent", color: "#6b6357", border: "1px solid transparent", fontSize: 13, marginTop: 4 }}>
            Send email magic link
          </button>
        )}

        <p className="auth-switch">
          {isSignUp ? "Already have an account?" : "New to Primoria?"} {" "}
          <Link href={isSignUp ? (isSupabaseActive ? "/login" : "/auth/sign-up") : (isSupabaseActive ? "/signup" : "/auth/sign-in")}>
            {isSignUp ? "Sign in" : "Create account"}
          </Link>
        </p>

        {isSupabaseActive && !isSignUp ? (
          <p className="auth-switch" style={{ marginTop: 8 }}>
            <Link href="/forgot">Forgot password?</Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}
