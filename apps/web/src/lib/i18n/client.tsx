"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { formatMessage } from "./format";
import type { I18nDictionary } from "./dictionaries";
import { UI_LANGUAGE_COOKIE, type UiLanguage } from "./languages";

type I18nContextValue = {
  language: UiLanguage;
  dictionary: I18nDictionary;
  setLanguage: (language: UiLanguage) => void;
  saving: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function setLanguageCookie(language: UiLanguage) {
  document.cookie = `${UI_LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({
  initialLanguage,
  initialDictionary,
  children,
}: {
  initialLanguage: UiLanguage;
  initialDictionary: I18nDictionary;
  children: React.ReactNode;
}) {
  const [language] = useState<UiLanguage>(initialLanguage);
  const [saving, startTransition] = useTransition();

  const setLanguage = useCallback(
    (next: UiLanguage) => {
      if (next === language) return;
      setLanguageCookie(next);
      startTransition(async () => {
        try {
          const response = await fetch("/api/settings/preferences", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ uiLanguage: next }),
          });
          if (!response.ok) throw new Error("save failed");
          window.location.reload();
        } catch {
          setLanguageCookie(language);
        }
      });
    },
    [language, startTransition],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      dictionary: initialDictionary,
      setLanguage,
      saving,
    }),
    [initialDictionary, language, saving, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  const testValue = (globalThis as typeof globalThis & { __PRIMORIA_TEST_I18N__?: I18nContextValue })
    .__PRIMORIA_TEST_I18N__;
  if (!value && !testValue) throw new Error("useI18n must be used within I18nProvider");
  return value ?? testValue!;
}

export function useT() {
  return useI18n().dictionary;
}

export function msg(template: string, values?: Record<string, string | number | null | undefined>) {
  return formatMessage(template, values);
}
