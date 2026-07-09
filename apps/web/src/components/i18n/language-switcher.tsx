"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useI18n, useT } from "@/lib/i18n/client";
import type { UiLanguage } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, saving } = useI18n();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuId = useId();
  const switcherRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const options: Array<{ value: UiLanguage; label: string }> = [
    { value: "zh", label: t.common.chinese },
    { value: "en", label: t.common.english },
  ];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === language));
  const current = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!open) return;

    function closeFromOutside(event: PointerEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeFromOutside);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  function wrapIndex(index: number) {
    return (index + options.length) % options.length;
  }

  function focusControlSoon() {
    requestAnimationFrame(() => controlRef.current?.focus());
  }

  function openMenu(index = selectedIndex) {
    setActiveIndex(wrapIndex(index));
    setOpen(true);
  }

  function closeMenu(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) focusControlSoon();
  }

  function update(value: UiLanguage) {
    if (value !== language) setLanguage(value);
    closeMenu(true);
  }

  function handleControlKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(open ? activeIndex + 1 : selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(open ? activeIndex - 1 : selectedIndex);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => wrapIndex(index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => wrapIndex(index - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      update(options[activeIndex]?.value ?? current.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    }
  }

  return (
    <div ref={switcherRef} className={`language-switcher ${className}`.trim()} data-open={open ? "true" : "false"} data-saving={saving ? "true" : "false"}>
      <button
        ref={controlRef}
        type="button"
        className="language-switcher-control"
        aria-label={t.language.switchLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={saving}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleControlKeyDown}
      >
        <span className="language-switcher-globe">
          <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
            <circle cx="10" cy="10" r="7.2" />
            <path d="M2.8 10h14.4M10 2.8c2 2 3 4.4 3 7.2s-1 5.2-3 7.2M10 2.8c-2 2-3 4.4-3 7.2s1 5.2 3 7.2" />
          </svg>
        </span>
        <span className="language-switcher-label">{current.label}</span>
        <svg className="language-switcher-chevron" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
          <path d="M4.5 6.2 8 9.7l3.5-3.5" />
        </svg>
      </button>

      {open ? (
        <div id={menuId} className="language-switcher-menu" role="menu" aria-label={t.language.switchLabel} onKeyDown={handleMenuKeyDown}>
          {options.map((option, index) => {
            const selected = option.value === language;
            return (
              <button
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                className="language-switcher-option"
                role="menuitemradio"
                aria-checked={selected}
                tabIndex={activeIndex === index ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => update(option.value)}
              >
                <span className="language-switcher-check" aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
