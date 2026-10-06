"use client";

import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/client";
import type { ContentLanguage } from "@/lib/settings/user-settings";

export function ContentLanguageSelect({ initialValue }: { initialValue: ContentLanguage }) {
  const t = useT();
  const [value, setValue] = useState<ContentLanguage>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const options: Array<{ value: ContentLanguage; label: string; note: string }> = [
    { value: "auto", label: t.language.autoLabel, note: t.language.autoNote },
    { value: "zh", label: t.common.chinese, note: t.language.zhNote },
    { value: "en", label: t.common.english, note: t.language.enNote },
  ];

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
        setError(t.language.saveError);
      }
    });
  }

  return (
    <div className="settings-segmented-wrap">
      <div className="settings-segmented" role="radiogroup" aria-label={t.language.contentTitle}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={isPending}
            onClick={() => update(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="settings-segmented-note">{options.find((option) => option.value === value)?.note}</p>
      {error ? <p className="settings-inline-error" role="alert">{error}</p> : null}
    </div>
  );
}
