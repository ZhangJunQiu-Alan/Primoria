import { cookies, headers } from "next/headers";
import { getCurrentUserForRsc } from "@/lib/auth/session";
import { getUserPreferences } from "@/lib/settings/user-settings";
import {
  getDictionary,
  isUiLanguage,
  languageFromAcceptLanguage,
  UI_LANGUAGE_COOKIE,
  type I18nDictionary,
  type UiLanguage,
} from "./dictionaries";

export async function resolveUiLanguage(userId?: string | null): Promise<UiLanguage> {
  if (userId) {
    const preferences = await getUserPreferences(userId);
    if (preferences.uiLanguage) return preferences.uiLanguage;
  }

  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get(UI_LANGUAGE_COOKIE)?.value;
  if (isUiLanguage(cookieLanguage)) return cookieLanguage;

  const headerStore = await headers();
  return languageFromAcceptLanguage(headerStore.get("accept-language"));
}

export async function resolveUiLanguageForUser(userId?: string | null): Promise<UiLanguage> {
  return resolveUiLanguage(userId);
}

export async function getCurrentUiLanguage(): Promise<UiLanguage> {
  // Root Layout must stay renderable while the auth database is unavailable.
  // Persisted user preferences are loaded by page-level boundaries instead.
  return resolveUiLanguage(null);
}

export async function getDictionaryForUser(userId?: string | null): Promise<{ language: UiLanguage; dictionary: I18nDictionary }> {
  const language = await resolveUiLanguageForUser(userId);
  return { language, dictionary: getDictionary(language) };
}

export async function getCurrentDictionary(): Promise<{ language: UiLanguage; dictionary: I18nDictionary }> {
  const user = await getCurrentUserForRsc();
  return getDictionaryForUser(user?.id ?? null);
}
