"use client";

import { useEffect, useState } from "react";
import type { TutorProviderSettings } from "@/lib/ai/types";
import { SettingsModal } from "./settings-modal";
import { TutorSidebar } from "./sidebar";
import { TutorChatClient } from "./tutor-chat-client";
import { TutorTopbar } from "./topbar";

const STORAGE_KEY = "primoria:tutor-provider-settings";

export function TutorWorkspaceClient() {
  const [settings, setSettings] = useState<TutorProviderSettings>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatResetKey, setChatResetKey] = useState(0);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setSettings(JSON.parse(raw) as TutorProviderSettings);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function saveSettings(next: TutorProviderSettings) {
    setSettings(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <>
      <TutorSidebar onNewChat={() => setChatResetKey((key) => key + 1)} />
      <section className="workspace">
        <TutorTopbar onOpenSettings={() => setSettingsOpen(true)} />
        <TutorChatClient key={chatResetKey} settings={settings} resetKey={chatResetKey} />
        <SettingsModal
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      </section>
    </>
  );
}
