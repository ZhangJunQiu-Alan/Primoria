import { eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { userSettings } from "../db/schema";
import type { TutorProviderSettings } from "../agent-os";

export async function getProviderSettings(userId: string): Promise<TutorProviderSettings> {
  if (!hasDatabaseUrl()) return {};
  const rows = await getDb().select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return (rows[0]?.providerSettings ?? {}) as TutorProviderSettings;
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
