"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(mode === "sign-in" ? "/api/auth/sign-in" : "/api/auth/sign-up", {
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
      setLoading(false);
    }
  }

  const isSignUp = mode === "sign-up";

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-heading">
        <span className="course-block-tag">Account</span>
        <h1>{isSignUp ? "Create your Primoria account" : "Sign in to Primoria"}</h1>
        <p>
          {isSignUp
            ? "Save courses, learning apps, and future memory to your own workspace."
            : "Continue with your saved courses and personalized learning context."}
        </p>
      </div>

      {isSignUp ? (
        <label className="auth-field">
          <span>Name</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ada" />
        </label>
      ) : null}

      <label className="auth-field">
        <span>Email</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
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
        />
      </label>

      {error ? <p className="auth-error">{error}</p> : null}

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? "Working…" : isSignUp ? "Create account" : "Sign in"}
      </button>

      <p className="auth-switch">
        {isSignUp ? "Already have an account?" : "New to Primoria?"} {" "}
        <Link href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"}>{isSignUp ? "Sign in" : "Create account"}</Link>
      </p>
      <p className="auth-note">Phone OTP identities are reserved in the data model and can be connected later.</p>
    </form>
  );
}
