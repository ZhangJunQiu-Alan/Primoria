import { DEFAULT_AI_TUTOR_PERSONA, normalizeAiTutorPersona } from '@/shared/ai-tutor/persona';
import type { ViewerAiProvider, ViewerProfile, ViewerSettingsBundle, ViewerThemeMode, ViewerUserSettings } from '@/shared/api/viewer/types';
import { supabase } from '@/shared/api/supabase';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';
import { fetchViewerProfile, updateProfile } from '@/shared/api/viewer/profileApi';
import { DEFAULT_VIEWER_LANGUAGE, normalizeViewerLanguage } from '@/shared/i18n/locale';

export const DEFAULT_VIEWER_USER_SETTINGS: ViewerUserSettings = {
  theme_mode: 'system',
  language: DEFAULT_VIEWER_LANGUAGE,
  notification_daily_reminder: false,
  notification_reminder_time: '20:00',
  marketing_emails: false,
  accessibility_mode: false,
  ai_tutor_persona: DEFAULT_AI_TUTOR_PERSONA,
  home_companion_enabled: true,
  ai_provider: 'google',
  ai_base_url: '',
  ai_api_key: '',
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
    language: normalizeViewerLanguage(raw?.language),
    notification_daily_reminder: raw?.notification_daily_reminder === true,
    notification_reminder_time: normalizeReminderTime(raw?.notification_reminder_time),
    marketing_emails: raw?.marketing_emails === true,
    accessibility_mode: raw?.accessibility_mode === true,
    ai_tutor_persona: normalizeAiTutorPersona(raw?.ai_tutor_persona),
    home_companion_enabled: raw?.home_companion_enabled !== false,
    ai_provider: normalizeAiProvider(raw?.ai_provider),
    ai_base_url: normalizeOptionalString(raw?.ai_base_url),
    ai_api_key: normalizeOptionalString(raw?.ai_api_key),
  };
}

function normalizeAiProvider(value: unknown): ViewerAiProvider {
  return value === 'openai' || value === 'anthropic' ? value : 'google';
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
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
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    const nextState = patchFixtureState((state) => ({
      ...state,
      userSettings: {
        ...state.userSettings,
        ...payload,
      },
    }));
    return normalizeUserSettings(nextState.userSettings);
  }

  const { data: existingSettings, error: loadError } = await supabase
    .from('user_settings')
    .select(
      'theme_mode, language, notification_daily_reminder, notification_reminder_time, marketing_emails, accessibility_mode, ai_tutor_persona, home_companion_enabled, ai_provider, ai_base_url, ai_api_key',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  const next = normalizeUserSettings({
    ...(existingSettings as Partial<ViewerUserSettings> | null),
    ...payload,
  });

  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    theme_mode: next.theme_mode,
    language: next.language,
    notification_daily_reminder: next.notification_daily_reminder,
    notification_reminder_time: next.notification_reminder_time,
    marketing_emails: next.marketing_emails,
    accessibility_mode: next.accessibility_mode,
    ai_tutor_persona: next.ai_tutor_persona,
    home_companion_enabled: next.home_companion_enabled,
    ai_provider: next.ai_provider,
    ai_base_url: next.ai_base_url,
    ai_api_key: next.ai_api_key,
  });

  if (error) {
    throw error;
  }

  return next;
}
