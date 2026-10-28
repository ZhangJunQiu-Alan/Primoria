"use client";

import { useI18n, useT } from "@/lib/i18n/client";
import type { UiLanguage } from "@/lib/i18n/languages";

const OPTIONS: Array<{ value: UiLanguage; label: string }> = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
];

/** Two-option segmented control for public pages, where a dropdown menu is heavier than the choice. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage, saving } = useI18n();
  const t = useT();

  return (
    <div className={`language-toggle ${className}`.trim()} role="group" aria-label={t.language.switchLabel} data-saving={saving ? "true" : "false"}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="language-toggle-option"
          lang={option.value === "zh" ? "zh-CN" : "en"}
          aria-pressed={option.value === language}
          disabled={saving}
          onClick={() => setLanguage(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
