"use client";

import { useEffect, useState } from "react";
import type { TutorProviderSettings } from "@/lib/ai/types";
import { ChatHistoryPopup } from "./history-popup";
import { TutorNavRail } from "./nav-rail";
import { SettingsModal } from "./settings-modal";
import { TutorChatCopilot } from "./tutor-chat-copilot";
import { TutorTopbar } from "./topbar";

const STORAGE_KEY = "primoria:tutor-provider-settings";

export function TutorWorkspaceClient() {
  const [settings, setSettings] = useState<TutorProviderSettings>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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
      <TutorNavRail />
      <section className="workspace">
        <TutorTopbar
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
        <TutorChatCopilot />
        <SettingsModal
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
        <ChatHistoryPopup
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onNewChat={() => {}}
          onSelectChat={() => {}}
        />
      </section>
    </>
  );
}
