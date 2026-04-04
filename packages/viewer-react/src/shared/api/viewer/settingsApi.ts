import type { ViewerProfile, ViewerSettingsBundle, ViewerThemeMode, ViewerUserSettings } from '@/shared/api/viewer/types';
import { supabase } from '@/shared/api/supabase';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';
import { fetchViewerProfile, updateProfile } from '@/shared/api/viewer/profileApi';

export const DEFAULT_VIEWER_USER_SETTINGS: ViewerUserSettings = {
  theme_mode: 'system',
  language: 'zh-CN',
  notification_daily_reminder: false,
  notification_reminder_time: '20:00',
  marketing_emails: false,
  accessibility_mode: false,
};

function normalizeThemeMode(value: unknown): ViewerThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function normalizeReminderTime(value: unknown) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return /^\d{2}:\d{2}$/.test(candidate) ? candidate : DEFAULT_VIEWER_USER_SETTINGS.notification_reminder_time;
}

function normalizeUserSettings(raw: Partial<ViewerUserSettings> | null | undefined): ViewerUserSettings {
  return {
    theme_mode: normalizeThemeMode(raw?.theme_mode),
    language: raw?.language === 'en' ? 'en' : 'zh-CN',
    notification_daily_reminder: raw?.notification_daily_reminder === true,
    notification_reminder_time: normalizeReminderTime(raw?.notification_reminder_time),
    marketing_emails: raw?.marketing_emails === true,
    accessibility_mode: raw?.accessibility_mode === true,
  };
}

export async function fetchViewerSettings(userId: string): Promise<ViewerSettingsBundle> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    const state = readFixtureState();
    return {
      profile: state.profile,
      userSettings: normalizeUserSettings(state.userSettings),
    };
  }

  const [profile, userSettingsResult] = await Promise.all([
    fetchViewerProfile(userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (userSettingsResult.error) {
    throw userSettingsResult.error;
  }

  return {
    profile,
    userSettings: normalizeUserSettings(userSettingsResult.data as Partial<ViewerUserSettings> | null),
  };
}

export async function saveProfileSettings(userId: string, payload: Partial<ViewerProfile>) {
  const result = await updateProfile(userId, payload);
  if (!result.ok) {
    throw result.error ?? new Error('Profile update failed.');
  }
  return result;
}

export async function saveAccountSystemSettings(
  userId: string,
  payload: Partial<ViewerUserSettings>,
): Promise<ViewerUserSettings> {
  const next = normalizeUserSettings({ ...DEFAULT_VIEWER_USER_SETTINGS, ...payload });

  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => ({
      ...state,
      userSettings: {
        ...state.userSettings,
        ...next,
      },
    }));
    return next;
  }

  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    theme_mode: next.theme_mode,
    language: next.language,
    notification_daily_reminder: next.notification_daily_reminder,
    notification_reminder_time: next.notification_reminder_time,
    marketing_emails: next.marketing_emails,
    accessibility_mode: next.accessibility_mode,
  });

  if (error) {
    throw error;
  }

  return next;
}
