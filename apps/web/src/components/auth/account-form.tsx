"use client";

import { useState } from "react";

import { authStyles } from "@/components/auth/styles";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

type Feedback = { kind: "error" | "success"; text: string } | null;

export function AccountForm({
  email,
  initialDisplayName,
}: {
  email: string;
  initialDisplayName: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [profileMsg, setProfileMsg] = useState<Feedback>(null);
  const [profilePending, setProfilePending] = useState(false);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfilePending(true);
    setProfileMsg(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "保存失败，请重试。");
      setProfileMsg({ kind: "success", text: "资料已保存。" });
    } catch (err) {
      setProfileMsg({ kind: "error", text: errorMessage(err, "保存失败，请重试。") });
    } finally {
      setProfilePending(false);
    }
  }

  function renderMsg(msg: Feedback) {
    if (!msg) return null;
    return <p style={msg.kind === "error" ? authStyles.error : authStyles.success}>{msg.text}</p>;
  }

  return (
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>账户设置</h1>
      <p style={{ ...authStyles.label, marginBottom: 8 }}>当前邮箱：{email}</p>

      <form onSubmit={saveProfile} style={authStyles.section}>
        <div style={authStyles.sectionTitle}>个人资料</div>
        <input
          type="text"
          placeholder="昵称"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={authStyles.input}
        />
        <button type="submit" disabled={profilePending} style={authStyles.primaryButton}>
          {profilePending ? "保存中…" : "保存资料"}
        </button>
        {renderMsg(profileMsg)}
      </form>
    </div>
  );
}
