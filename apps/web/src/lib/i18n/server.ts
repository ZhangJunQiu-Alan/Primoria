import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
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

export async function getCurrentUiLanguage(): Promise<UiLanguage> {
  const user = await getCurrentUser();
  return resolveUiLanguage(user?.id ?? null);
}

export async function getCurrentDictionary(): Promise<{ language: UiLanguage; dictionary: I18nDictionary }> {
  const language = await getCurrentUiLanguage();
  return { language, dictionary: getDictionary(language) };
}

