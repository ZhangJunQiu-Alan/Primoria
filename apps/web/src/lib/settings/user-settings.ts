import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { userSettings } from "../db/schema";
import { isUiLanguage, type UiLanguage } from "../i18n/dictionaries";

export const CONTENT_LANGUAGES = ["auto", "zh", "en"] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export type UserPreferences = {
  contentLanguage: ContentLanguage;
  uiLanguage: UiLanguage | null;
  timeZone: string;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  contentLanguage: "auto",
  uiLanguage: null,
  timeZone: "UTC",
};

function normalizeContentLanguage(value: unknown): ContentLanguage {
  return typeof value === "string" && (CONTENT_LANGUAGES as readonly string[]).includes(value) ? (value as ContentLanguage) : "auto";
}

function normalizeUiLanguage(value: unknown): UiLanguage | null {
  return isUiLanguage(value) ? value : null;
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function normalizePreferences(value: unknown): UserPreferences {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    ...DEFAULT_PREFERENCES,
    contentLanguage: normalizeContentLanguage(raw.contentLanguage),
    uiLanguage: normalizeUiLanguage(raw.uiLanguage),
    timeZone: isValidTimeZone(raw.timeZone) ? raw.timeZone : "UTC",
  };
}

export async function getUserPreferences(userId: string | null | undefined): Promise<UserPreferences> {
  if (!userId || !hasDatabaseUrl()) return DEFAULT_PREFERENCES;
  const rows = await getDb().select({ preferences: userSettings.preferences }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return normalizePreferences(rows[0]?.preferences);
}

export async function saveUserPreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await getUserPreferences(userId);
  const next = normalizePreferences({ ...current, ...patch });
  if (!hasDatabaseUrl()) return next;
  const now = new Date();
  await getDb()
    .insert(userSettings)
    .values({
      userId,
      preferences: next,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        preferences: next,
        updatedAt: now,
      },
    });
  return next;
}
