"use client";

import { useEffect, useState } from "react";
import type { TutorProviderSettings } from "@/lib/ai/types";

type SettingsModalProps = {
  open: boolean;
  settings: TutorProviderSettings;
  onClose: () => void;
  onSave: (settings: TutorProviderSettings) => void;
};

export function SettingsModal({ open, settings, onClose, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState<TutorProviderSettings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings, open]);

  if (!open) return null;

  return (
    <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="Provider settings">
      <form
        className="settings-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            baseUrl: draft.baseUrl?.trim() || undefined,
            apiKey: draft.apiKey?.trim() || undefined,
            model: draft.model?.trim() || undefined,
          });
          onClose();
        }}
      >
        <div>
          <div className="message-label">Provider settings</div>
          <h2>OpenAI-compatible backend</h2>
          <p>Leave fields blank to use the server defaults from <code>apps/web/.env.local</code>.</p>
        </div>

        <label>
          Base URL
          <input
            value={draft.baseUrl ?? ""}
            placeholder="https://ai.orbitlink.me/v1"
            onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
          />
        </label>

        <label>
          Model
          <input
            value={draft.model ?? ""}
            placeholder="gpt-5.4"
            onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
          />
        </label>

        <label>
          API Key
          <input
            value={draft.apiKey ?? ""}
            type="password"
            placeholder="Use server default if blank"
            onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
          />
        </label>

        <div className="settings-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="soft-btn">
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}
