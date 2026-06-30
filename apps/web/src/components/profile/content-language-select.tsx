"use client";

import { useState, useTransition } from "react";
import type { ContentLanguage } from "@/lib/settings/user-settings";

const LANGUAGE_OPTIONS: Array<{ value: ContentLanguage; label: string; note: string }> = [
  { value: "auto", label: "Auto detect", note: "Follow each learning goal" },
  { value: "zh", label: "简体中文", note: "Prefer Chinese output" },
  { value: "en", label: "English", note: "Prefer English output" },
];

export function ContentLanguageSelect({ initialValue }: { initialValue: ContentLanguage }) {
  const [value, setValue] = useState<ContentLanguage>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(next: ContentLanguage) {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/preferences", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentLanguage: next }),
        });
        if (!res.ok) throw new Error("save failed");
      } catch {
        setValue(previous);
        setError("Could not save language preference.");
      }
    });
  }

  return (
    <div className="settings-select-wrap">
      <select
        aria-label="Content language"
        value={value}
        disabled={isPending}
        onChange={(event) => update(event.target.value as ContentLanguage)}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} · {option.note}
          </option>
        ))}
      </select>
      {error ? <p className="settings-inline-error">{error}</p> : null}
    </div>
  );
}
