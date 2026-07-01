"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import {
  dictionaries,
  formatMessage,
  getDictionary,
  isUiLanguage,
  UI_LANGUAGE_COOKIE,
  type I18nDictionary,
  type UiLanguage,
} from "./dictionaries";

type I18nContextValue = {
  language: UiLanguage;
  dictionary: I18nDictionary;
  setLanguage: (language: UiLanguage) => void;
  saving: boolean;
};

const I18nContext = createContext<I18nContextValue>({
  language: "zh",
  dictionary: dictionaries.zh,
  setLanguage: () => undefined,
  saving: false,
});

function setLanguageCookie(language: UiLanguage) {
  document.cookie = `${UI_LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: UiLanguage;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<UiLanguage>(isUiLanguage(initialLanguage) ? initialLanguage : "zh");
  const [saving, startTransition] = useTransition();

  const setLanguage = useCallback(
    (next: UiLanguage) => {
      if (next === language) return;
      const previous = language;
      setLanguageState(next);
      setLanguageCookie(next);
      startTransition(async () => {
        try {
          const response = await fetch("/api/settings/preferences", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ uiLanguage: next }),
          });
          if (!response.ok) throw new Error("save failed");
        } catch {
          setLanguageState(previous);
          setLanguageCookie(previous);
        }
      });
    },
    [language, startTransition],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      dictionary: getDictionary(language),
      setLanguage,
      saving,
    }),
    [language, saving, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useI18n().dictionary;
}

export function msg(template: string, values?: Record<string, string | number | null | undefined>) {
  return formatMessage(template, values);
}
