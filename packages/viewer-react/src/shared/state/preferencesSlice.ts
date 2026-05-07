import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_AI_TUTOR_PERSONA, normalizeAiTutorPersona } from '@/shared/ai-tutor/persona';
import type { ViewerAiTutorPersona } from '@/shared/api/viewer/types';
import {
  DEFAULT_VIEWER_LANGUAGE,
  detectBrowserViewerLanguage,
  normalizeViewerLanguage,
  type ViewerLanguage,
} from '@/shared/i18n/locale';

export const VIEWER_PREFERENCES_STORAGE_KEY = 'primoria.viewer.preferences';

export type ViewerPreferencesState = {
  themeMode: 'system' | 'light' | 'dark';
  language: ViewerLanguage;
  aiTutorPersona: ViewerAiTutorPersona;
  homeCompanionEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  streakReminderEnabled: boolean;
  achievementReminderEnabled: boolean;
  autoplayAudio: boolean;
  learningHints: boolean;
  dailyGoalMinutes: number;
  privateProfile: boolean;
  shareLearningActivity: boolean;
  allowFollowers: boolean;
  wifiOnlyDownloads: boolean;
  aiProvider: 'google' | 'openai' | 'anthropic';
  aiBaseUrl: string;
  aiApiKey: string;
};

function normalizeAiProvider(value: unknown): 'google' | 'openai' | 'anthropic' {
  return value === 'openai' || value === 'anthropic' ? value : 'google';
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

const defaultState: ViewerPreferencesState = {
  themeMode: 'system',
  language: DEFAULT_VIEWER_LANGUAGE,
  aiTutorPersona: DEFAULT_AI_TUTOR_PERSONA,
  homeCompanionEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
  dailyReminderEnabled: false,
  dailyReminderTime: '20:00',
  streakReminderEnabled: true,
  achievementReminderEnabled: true,
  autoplayAudio: true,
  learningHints: true,
  dailyGoalMinutes: 20,
  privateProfile: false,
  shareLearningActivity: true,
  allowFollowers: true,
  wifiOnlyDownloads: false,
  aiProvider: 'google',
  aiBaseUrl: '',
  aiApiKey: '',
};

function loadState(): ViewerPreferencesState {
  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(VIEWER_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return {
        ...defaultState,
        language: detectBrowserViewerLanguage(),
      };
    }

    const parsed = JSON.parse(raw) as Partial<ViewerPreferencesState>;
    return {
      ...defaultState,
      ...parsed,
      language: normalizeViewerLanguage(parsed.language),
      aiTutorPersona: normalizeAiTutorPersona(parsed.aiTutorPersona),
      homeCompanionEnabled: parsed.homeCompanionEnabled !== false,
      aiProvider: normalizeAiProvider(parsed.aiProvider),
      aiBaseUrl: normalizeOptionalString(parsed.aiBaseUrl),
      aiApiKey: normalizeOptionalString(parsed.aiApiKey),
    };
  } catch {
    return {
      ...defaultState,
      language: detectBrowserViewerLanguage(),
    };
  }
}

export function saveViewerPreferences(state: ViewerPreferencesState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(VIEWER_PREFERENCES_STORAGE_KEY, JSON.stringify(state));
}

const preferencesSlice = createSlice({
  name: 'viewerPreferences',
  initialState: loadState,
  reducers: {
    patchPreferences(state, action: PayloadAction<Partial<ViewerPreferencesState>>) {
      Object.assign(state, action.payload);
    },
    resetPreferences() {
      return defaultState;
    },
  },
});

export const { patchPreferences, resetPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;
