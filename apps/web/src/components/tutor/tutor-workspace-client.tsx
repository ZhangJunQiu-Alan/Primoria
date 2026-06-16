"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth/types";
import type { TutorProviderSettings } from "@/lib/agent-os";
import { ChatHistoryPopup } from "./history-popup";
import { TutorNavRail } from "./nav-rail";
import { SettingsModal } from "./settings-modal";
import { TutorChatCopilot } from "./tutor-chat-copilot";
import { TutorTopbar } from "./topbar";

const STORAGE_KEY = "primoria:tutor-provider-settings";

type AuthState = {
  authEnabled: boolean;
  user: AuthUser | null;
  loaded: boolean;
};

async function loadProviderSettingsFromServer() {
  try {
    const response = await fetch("/api/settings/provider", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { authEnabled?: boolean; settings?: TutorProviderSettings };
    if (!data.authEnabled) return null;
    return data.settings ?? {};
  } catch {
    return null;
  }
}

export function TutorWorkspaceClient({ initialAuthState }: { initialAuthState: AuthState }) {
  const [settings, setSettings] = useState<TutorProviderSettings>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let cancelled = false;
    async function loadAuth() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { authEnabled: boolean; user: AuthUser | null };
        if (!cancelled) setAuthState({ authEnabled: data.authEnabled, user: data.user, loaded: true });
      } catch {
        if (!cancelled) setAuthState((current) => ({ ...current, loaded: true }));
      }
    }
    void loadAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      if (!authState.loaded) return;
      if (authState.authEnabled && !authState.user) {
        setSettings({});
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const serverSettings = await loadProviderSettingsFromServer();
      if (cancelled) return;
      if (serverSettings) {
        setSettings(serverSettings);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serverSettings));
        return;
      }
      if (authState.authEnabled) return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        setSettings(JSON.parse(raw) as TutorProviderSettings);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [authState.authEnabled, authState.loaded, authState.user]);

  async function saveSettings(next: TutorProviderSettings) {
    if (authState.authEnabled && !authState.user) return;
    setSettings(next);
    if (!authState.authEnabled) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    try {
      await fetch("/api/settings/provider", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {
      if (!authState.authEnabled) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }

  const authRequired = authState.loaded && authState.authEnabled && !authState.user;

  return (
    <>
      <TutorNavRail initialAuthState={{ authEnabled: authState.authEnabled, user: authState.user }} />
      <section className="workspace">
        <TutorTopbar
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
        {!authState.loaded ? (
          <AuthLoadingPanel />
        ) : authRequired ? (
          <AuthRequiredPanel />
        ) : (
          <TutorChatCopilot />
        )}
        <SettingsModal
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            void saveSettings(next);
          }}
        />
        <ChatHistoryPopup
          open={historyOpen && !authRequired}
          onClose={() => setHistoryOpen(false)}
          onNewChat={() => {}}
          onSelectChat={() => {}}
        />
      </section>
    </>
  );
}

function AuthLoadingPanel() {
  return (
    <div className="auth-required-shell">
      <article className="auth-required-card">
        <span className="course-block-tag">Checking session</span>
        <h1>Loading your workspace…</h1>
        <p>Primoria is verifying your account before opening the tutor.</p>
      </article>
    </div>
  );
}

function AuthRequiredPanel() {
  return (
    <div className="auth-required-shell">
      <article className="auth-required-card">
        <span className="course-block-tag">Account required</span>
        <h1>Your tutor workspace is private now</h1>
        <p>
          Sign in to use AI chat, save CopilotKit threads, generate courses, and keep Library data in Postgres.
        </p>
        <div className="auth-required-actions">
          <Link href="/auth/sign-in">Sign in</Link>
          <Link href="/auth/sign-up">Create account</Link>
        </div>
      </article>
    </div>
  );
}
