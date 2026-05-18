"use client";

import { useEffect, useState } from "react";
import type { TutorProviderSettings } from "@/lib/ai/types";
import { SettingsModal } from "./settings-modal";
import { TutorChatClient } from "./tutor-chat-client";
import { TutorTopbar } from "./topbar";

const STORAGE_KEY = "primoria:tutor-provider-settings";

export function TutorWorkspaceClient() {
  const [settings, setSettings] = useState<TutorProviderSettings>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    <section className="workspace">
      <TutorTopbar onOpenSettings={() => setSettingsOpen(true)} />
      <TutorChatClient settings={settings} />
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />
    </section>
  );
}
