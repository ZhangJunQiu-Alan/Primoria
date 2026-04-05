import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
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
};

const defaultState: ViewerPreferencesState = {
  themeMode: 'system',
  language: DEFAULT_VIEWER_LANGUAGE,
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
