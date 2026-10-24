"use client";

import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/client";
import { TUTOR_STYLES, type TutorStyle } from "@/lib/learner-profile/types";

export function TutorStyleSelect({ initialValue }: { initialValue: TutorStyle }) {
  const t = useT();
  const [value, setValue] = useState<TutorStyle>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(next: TutorStyle) {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/tutor-style", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tutorStyle: next }),
        });
        if (!res.ok) throw new Error("save failed");
      } catch {
        setValue(previous);
        setError(t.settings.tutorStyleSaveError);
      }
    });
  }

  return (
    <div className="settings-segmented-wrap">
      <div className="settings-segmented" role="radiogroup" aria-label={t.settings.tutorStyleTitle}>
        {TUTOR_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            role="radio"
            aria-checked={value === style}
            disabled={isPending}
            onClick={() => update(style)}
          >
            {t.onboarding.styles[style].title}
          </button>
        ))}
      </div>
      <p className="settings-segmented-note">{t.onboarding.styles[value].meta}</p>
      {error ? <p className="settings-inline-error" role="alert">{error}</p> : null}
    </div>
  );
}
