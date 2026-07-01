"use client";

import { useI18n, useT } from "@/lib/i18n/client";
import type { UiLanguage } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, saving } = useI18n();
  const t = useT();

  function update(value: string) {
    if (value === "zh" || value === "en") setLanguage(value as UiLanguage);
  }

  return (
    <label className={`language-switcher ${className}`.trim()}>
      <span className="sr-only">{t.language.switchLabel}</span>
      <select value={language} disabled={saving} onChange={(event) => update(event.target.value)}>
        <option value="zh">{t.common.chinese}</option>
        <option value="en">{t.common.english}</option>
      </select>
    </label>
  );
}

