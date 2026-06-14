"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { TurnstileWidget } from "@/components/auth/turnstile";
import { authStyles } from "@/components/auth/styles";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "登录回调失败，请重试。" : null,
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
      setError("请先完成人机验证。");
      return false;
    }
    return true;
  }

  async function handlePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!guardCaptcha()) return;
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo(), ...captchaOptions() },
        });
        if (err) throw err;
        setStatus("注册成功，请查收确认邮件后再登录。");
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
      setError(errorMessage(err, "操作失败，请重试。"));
      resetCaptcha();
    } finally {
      setPending(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("请先填写邮箱。");
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
      setStatus("魔法链接已发送，请查收邮箱。");
    } catch (err) {
      setError(errorMessage(err, "发送失败，请重试。"));
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
      setError(errorMessage(err, "Google 登录暂不可用。"));
    }
  }

  const title = mode === "signup" ? "创建账号" : "登录 Primoria";
  const cta = mode === "signup" ? "注册" : "登录";

  return (
    <div style={{ maxWidth: 360, margin: "10vh auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>{title}</h1>

      <button type="button" onClick={handleGoogle} disabled={pending} style={secondaryButtonStyle}>
        使用 Google 继续
      </button>

      <div style={{ textAlign: "center", color: "#aaa", fontSize: 12, margin: "14px 0" }}>或</div>

      <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          autoComplete="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="密码（至少 8 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={inputStyle}
        />
        {captchaEnabled && TURNSTILE_SITE_KEY ? (
          <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} resetKey={captchaResetKey} />
        ) : null}
        <button type="submit" disabled={pending} style={primaryButtonStyle}>
          {pending ? "处理中…" : cta}
        </button>
      </form>

      <button type="button" onClick={handleMagicLink} disabled={pending} style={secondaryButtonStyle}>
        发送邮箱魔法链接
      </button>

      {error ? <p style={{ color: "#c0392b", fontSize: 13, marginTop: 12 }}>{error}</p> : null}
      {status ? <p style={{ color: "#27713a", fontSize: 13, marginTop: 12 }}>{status}</p> : null}

      {mode === "signin" ? (
        <p style={authStyles.footer}>
          <Link href="/forgot">忘记密码？</Link>
        </p>
      ) : null}

      <p style={{ fontSize: 13, marginTop: 20, color: "#555" }}>
        {mode === "signup" ? (
          <>
            已有账号？<Link href="/login">去登录</Link>
          </>
        ) : (
          <>
            还没有账号？<Link href="/signup">去注册</Link>
          </>
        )}
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  fontSize: 14,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  fontSize: 14,
  cursor: "pointer",
};
