"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { authStyles } from "@/components/auth/styles";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/reset-password`
          : undefined;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (err) throw err;
      setStatus("重置邮件已发送，请查收邮箱并点击链接设置新密码。");
    } catch (err) {
      setError(errorMessage(err, "发送失败，请重试。"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>找回密码</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          autoComplete="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={authStyles.input}
        />
        <button type="submit" disabled={pending} style={authStyles.primaryButton}>
          {pending ? "发送中…" : "发送重置邮件"}
        </button>
      </form>

      {error ? <p style={authStyles.error}>{error}</p> : null}
      {status ? <p style={authStyles.success}>{status}</p> : null}

      <p style={authStyles.footer}>
        <Link href="/login">返回登录</Link>
      </p>
    </div>
  );
}
