"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { authStyles } from "@/components/auth/styles";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("两次输入的密码不一致。");
      return;
    }
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setStatus("密码已更新，正在跳转…");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "更新失败，请重新发起找回流程。"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>设置新密码</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="password"
          autoComplete="new-password"
          placeholder="新密码（至少 8 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={authStyles.input}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="确认新密码"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          style={authStyles.input}
        />
        <button type="submit" disabled={pending} style={authStyles.primaryButton}>
          {pending ? "更新中…" : "更新密码"}
        </button>
      </form>

      {error ? <p style={authStyles.error}>{error}</p> : null}
      {status ? <p style={authStyles.success}>{status}</p> : null}
    </div>
  );
}
