"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { authStyles } from "@/components/auth/styles";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

type Feedback = { kind: "error" | "success"; text: string } | null;

export function AccountForm({
  userId,
  email,
  initialDisplayName,
  initialAvatarUrl,
}: {
  userId: string;
  email: string;
  initialDisplayName: string;
  initialAvatarUrl: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [profileMsg, setProfileMsg] = useState<Feedback>(null);
  const [profilePending, setProfilePending] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<Feedback>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<Feedback>(null);
  const [emailPending, setEmailPending] = useState(false);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfilePending(true);
    setProfileMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setProfileMsg({ kind: "success", text: "资料已保存。" });
    } catch (err) {
      setProfileMsg({ kind: "error", text: errorMessage(err, "保存失败，请重试。") });
    } finally {
      setProfilePending(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordPending(true);
    setPasswordMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setPasswordMsg({ kind: "success", text: "密码已更新。" });
    } catch (err) {
      setPasswordMsg({ kind: "error", text: errorMessage(err, "更新失败，请重试。") });
    } finally {
      setPasswordPending(false);
    }
  }

  async function changeEmail(event: React.FormEvent) {
    event.preventDefault();
    setEmailPending(true);
    setEmailMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMsg({
        kind: "success",
        text: "确认邮件已发送到新邮箱，点击确认后邮箱才会变更。",
      });
    } catch (err) {
      setEmailMsg({ kind: "error", text: errorMessage(err, "更新失败，请重试。") });
    } finally {
      setEmailPending(false);
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
        <input
          type="url"
          placeholder="头像 URL"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          style={authStyles.input}
        />
        <button type="submit" disabled={profilePending} style={authStyles.primaryButton}>
          {profilePending ? "保存中…" : "保存资料"}
        </button>
        {renderMsg(profileMsg)}
      </form>

      <form onSubmit={changePassword} style={authStyles.section}>
        <div style={authStyles.sectionTitle}>修改密码</div>
        <input
          type="password"
          autoComplete="new-password"
          placeholder="新密码（至少 8 位）"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          style={authStyles.input}
        />
        <button type="submit" disabled={passwordPending} style={authStyles.primaryButton}>
          {passwordPending ? "更新中…" : "更新密码"}
        </button>
        {renderMsg(passwordMsg)}
      </form>

      <form onSubmit={changeEmail} style={authStyles.section}>
        <div style={authStyles.sectionTitle}>修改邮箱</div>
        <input
          type="email"
          autoComplete="email"
          placeholder="新邮箱"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          style={authStyles.input}
        />
        <button type="submit" disabled={emailPending} style={authStyles.primaryButton}>
          {emailPending ? "提交中…" : "更新邮箱"}
        </button>
        {renderMsg(emailMsg)}
      </form>
    </div>
  );
}
