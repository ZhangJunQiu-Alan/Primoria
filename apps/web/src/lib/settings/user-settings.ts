import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { userSettings } from "../db/schema";
import type { TutorProviderSettings } from "../agent-os";

export const CONTENT_LANGUAGES = ["auto", "zh", "en"] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export type UserPreferences = {
  contentLanguage: ContentLanguage;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  contentLanguage: "auto",
};

function normalizeContentLanguage(value: unknown): ContentLanguage {
  return typeof value === "string" && (CONTENT_LANGUAGES as readonly string[]).includes(value) ? (value as ContentLanguage) : "auto";
}

function normalizePreferences(value: unknown): UserPreferences {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    ...DEFAULT_PREFERENCES,
    contentLanguage: normalizeContentLanguage(raw.contentLanguage),
  };
}

export async function getProviderSettings(userId: string): Promise<TutorProviderSettings> {
  if (!hasDatabaseUrl()) return {};
  const rows = await getDb().select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return (rows[0]?.providerSettings ?? {}) as TutorProviderSettings;
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

export async function saveProviderSettings(userId: string, settings: TutorProviderSettings): Promise<TutorProviderSettings> {
  if (!hasDatabaseUrl()) return settings;
  const now = new Date();
  await getDb()
    .insert(userSettings)
    .values({
      userId,
      providerSettings: settings,
      preferences: {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        providerSettings: settings,
        updatedAt: now,
      },
    });
  return settings;
}
