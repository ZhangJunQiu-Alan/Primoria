"use client";

import { useEffect, useState } from "react";
import type { TutorProviderSettings } from "@/lib/ai/types";
import { ChatHistoryPopup } from "./history-popup";
import { TutorNavRail } from "./nav-rail";
import { SettingsModal } from "./settings-modal";
import { TutorChatClient } from "./tutor-chat-client";
import { TutorChatCopilot } from "./tutor-chat-copilot";
import { TutorTopbar } from "./topbar";

const STORAGE_KEY = "primoria:tutor-provider-settings";
const USE_COPILOTKIT = process.env.NEXT_PUBLIC_USE_COPILOTKIT === "1";

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

export function TutorWorkspaceClient() {
  const [settings, setSettings] = useState<TutorProviderSettings>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatResetKey, setChatResetKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      const serverSettings = await loadProviderSettingsFromServer();
      if (cancelled) return;
      if (serverSettings) {
        setSettings(serverSettings);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serverSettings));
        return;
      }
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
  }, []);

  async function saveSettings(next: TutorProviderSettings) {
    setSettings(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    try {
      await fetch("/api/settings/provider", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {
      // Local fallback already persisted to localStorage.
    }
  }

  return (
    <>
      <TutorNavRail />
      <section className="workspace">
        <TutorTopbar
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
        {USE_COPILOTKIT ? (
          <TutorChatCopilot />
        ) : (
          <TutorChatClient key={chatResetKey} settings={settings} resetKey={chatResetKey} />
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
          open={historyOpen}
          useCopilotKit={USE_COPILOTKIT}
          onClose={() => setHistoryOpen(false)}
          onNewChat={() => {
            if (!USE_COPILOTKIT) setChatResetKey((key) => key + 1);
          }}
          onSelectChat={() => {
            if (!USE_COPILOTKIT) setChatResetKey((key) => key + 1);
          }}
        />
      </section>
    </>
  );
}
