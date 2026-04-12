import { DEFAULT_AI_TUTOR_PERSONA, normalizeAiTutorPersona } from '@/shared/ai-tutor/persona';
import { fetchAgentJson } from '@/shared/api/agentService';
import type { ViewerProfile, ViewerSettingsBundle, ViewerThemeMode, ViewerUserSettings } from '@/shared/api/viewer/types';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';
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
  const payload = await fetchAgentJson<{ profile: ViewerProfile; userSettings: Partial<ViewerUserSettings> | null }>(
    '/v1/viewer/settings/bundle',
  );

  return {
    profile: payload.profile,
    userSettings: normalizeUserSettings(payload.userSettings),
  };
}

export async function saveProfileSettings(userId: string, payload: Partial<ViewerProfile>) {
  return fetchAgentJson<{ ok: boolean }>('/v1/viewer/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
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
  const result = await fetchAgentJson<{ ok: boolean; userSettings: Partial<ViewerUserSettings> }>('/v1/viewer/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return normalizeUserSettings(result.userSettings);
}
