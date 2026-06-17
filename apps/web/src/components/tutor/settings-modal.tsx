"use client";

import { useState } from "react";
import type { TutorProviderSettings } from "@/lib/agent-os";

type SettingsModalProps = {
  open: boolean;
  settings: TutorProviderSettings;
  onClose: () => void;
  onSave: (settings: TutorProviderSettings) => void;
};

export function SettingsModal({ open, settings, onClose, onSave }: SettingsModalProps) {
  if (!open) return null;
  return <SettingsForm key={JSON.stringify(settings)} settings={settings} onClose={onClose} onSave={onSave} />;
}

function SettingsForm({ settings, onClose, onSave }: Omit<SettingsModalProps, "open">) {
  const [draft, setDraft] = useState<TutorProviderSettings>(settings);

  return (
    <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="Provider settings">
      <form
        className="settings-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            provider: draft.provider ?? "openai-compatible",
            baseUrl: draft.baseUrl?.trim() || undefined,
            apiKey: draft.apiKey?.trim() || undefined,
            model: draft.model?.trim() || undefined,
          });
          onClose();
        }}
      >
        <div>
          <div className="message-label">Provider settings</div>
          <h2>Model backend</h2>
          <p>Choose an OpenAI-compatible or Anthropic-compatible endpoint. Leave fields blank to use server defaults.</p>
        </div>

        <label>
          Provider
          <select
            value={draft.provider ?? "openai-compatible"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                provider: event.target.value as TutorProviderSettings["provider"],
              }))
            }
          >
            <option value="openai-compatible">OpenAI-compatible</option>
            <option value="anthropic-compatible">Anthropic-compatible</option>
          </select>
        </label>

        <label>
          Base URL
          <input
            value={draft.baseUrl ?? ""}
            placeholder={
              (draft.provider ?? "openai-compatible") === "anthropic-compatible"
                ? "https://api.anthropic.com"
                : "https://openrouter.ai/api/v1"
            }
            onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
          />
        </label>

        <label>
          Model
          <input
            value={draft.model ?? ""}
            placeholder={
              (draft.provider ?? "openai-compatible") === "anthropic-compatible"
                ? "claude-3-5-sonnet-latest"
                : "gpt-5.4"
            }
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
