"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n, useT } from "@/lib/i18n/client";
import type { UiLanguage } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, saving } = useI18n();
  const t = useT();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const switcherRef = useRef<HTMLDivElement>(null);
  const options: Array<{ value: UiLanguage; label: string; code: string }> = [
    { value: "zh", label: t.common.chinese, code: "中" },
    { value: "en", label: t.common.english, code: "EN" },
  ];
  const current = options.find((option) => option.value === language) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function closeFromOutside(event: PointerEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function update(value: UiLanguage) {
    if (value !== language) setLanguage(value);
    setOpen(false);
  }

  return (
    <div ref={switcherRef} className={`language-switcher ${className}`.trim()} data-open={open ? "true" : "false"} data-saving={saving ? "true" : "false"}>
      <button
        type="button"
        className="language-switcher-control"
        aria-label={t.language.switchLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={saving}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="language-switcher-globe">
          <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
            <circle cx="10" cy="10" r="7.2" />
            <path d="M2.8 10h14.4M10 2.8c2 2 3 4.4 3 7.2s-1 5.2-3 7.2M10 2.8c-2 2-3 4.4-3 7.2s1 5.2 3 7.2" />
          </svg>
        </span>
        <span className="language-switcher-label">{current.label}</span>
        <span className="language-switcher-code">{current.code}</span>
        <svg className="language-switcher-chevron" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
          <path d="M4.5 6.2 8 9.7l3.5-3.5" />
        </svg>
      </button>

      {open ? (
        <div id={menuId} className="language-switcher-menu" role="menu" aria-label={t.language.switchLabel}>
          {options.map((option) => {
            const selected = option.value === language;
            return (
              <button
                key={option.value}
                type="button"
                className="language-switcher-option"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => update(option.value)}
              >
                <span className="language-switcher-check" aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>
                <span>{option.label}</span>
                <span className="language-switcher-option-code">{option.code}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
