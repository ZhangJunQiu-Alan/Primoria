"use client";

import { useState } from "react";
import { authStyles } from "@/components/auth/styles";
import { useT } from "@/lib/i18n/client";

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
  const t = useT();
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
      if (!response.ok) throw new Error(data?.error ?? t.account.saveFailed);
      setProfileMsg({ kind: "success", text: t.account.saveSuccess });
    } catch (err) {
      setProfileMsg({ kind: "error", text: errorMessage(err, t.account.saveFailed) });
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
      <h1 style={authStyles.title}>{t.account.title}</h1>
      <p style={{ ...authStyles.label, marginBottom: 8 }}>{t.account.currentEmail}{email}</p>

      <form onSubmit={saveProfile} style={authStyles.section}>
        <div style={authStyles.sectionTitle}>{t.account.profileSection}</div>
        <input
          type="text"
          placeholder={t.account.displayNamePlaceholder}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={authStyles.input}
        />
        <button type="submit" disabled={profilePending} style={authStyles.primaryButton}>
          {profilePending ? t.account.saving : t.account.save}
        </button>
        {renderMsg(profileMsg)}
      </form>
    </div>
  );
}
