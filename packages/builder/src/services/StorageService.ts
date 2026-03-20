export type DashboardDifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type DashboardPriceTier = 'free' | 'premium';

export interface DashboardLocalSettings {
  defaultDifficulty: DashboardDifficultyLevel;
  defaultPriceTier: DashboardPriceTier;
  publishChecklist: boolean;
  publishConfirm: boolean;
  usageTelemetry: boolean;
  weeklyDigest: boolean;
}

const SETTINGS_KEY = 'primoria_builder_settings';
const DRAFT_PREFIX = 'primoria_draft_';

const DEFAULT_SETTINGS: DashboardLocalSettings = {
  defaultDifficulty: 'beginner',
  defaultPriceTier: 'free',
  publishChecklist: true,
  publishConfirm: true,
  usageTelemetry: true,
  weeklyDigest: true,
};

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function isDifficultyLevel(value: unknown): value is DashboardDifficultyLevel {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}

function isPriceTier(value: unknown): value is DashboardPriceTier {
  return value === 'free' || value === 'premium';
}

function sanitizeSettings(value: unknown): DashboardLocalSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const source = value as Partial<DashboardLocalSettings>;

  return {
    defaultDifficulty: isDifficultyLevel(source.defaultDifficulty)
      ? source.defaultDifficulty
      : DEFAULT_SETTINGS.defaultDifficulty,
    defaultPriceTier: isPriceTier(source.defaultPriceTier)
      ? source.defaultPriceTier
      : DEFAULT_SETTINGS.defaultPriceTier,
    publishChecklist:
      typeof source.publishChecklist === 'boolean'
        ? source.publishChecklist
        : DEFAULT_SETTINGS.publishChecklist,
    publishConfirm:
      typeof source.publishConfirm === 'boolean'
        ? source.publishConfirm
        : DEFAULT_SETTINGS.publishConfirm,
    usageTelemetry:
      typeof source.usageTelemetry === 'boolean'
        ? source.usageTelemetry
        : DEFAULT_SETTINGS.usageTelemetry,
    weeklyDigest:
      typeof source.weeklyDigest === 'boolean'
        ? source.weeklyDigest
        : DEFAULT_SETTINGS.weeklyDigest,
  };
}

export const StorageService = {
  loadDashboardSettings(): DashboardLocalSettings {
    const storage = getStorage();
    if (!storage || typeof storage.getItem !== 'function') {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const raw = storage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return sanitizeSettings(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveDashboardSettings(settings: DashboardLocalSettings) {
    const storage = getStorage();
    if (!storage || typeof storage.setItem !== 'function') return;

    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
    } catch {
      // Ignore local storage failures and keep the session usable.
    }
  },

  clearAllCourseDrafts() {
    const storage = getStorage();
    if (!storage || typeof storage.key !== 'function' || typeof storage.removeItem !== 'function') {
      return 0;
    }

    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(DRAFT_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
    return keysToRemove.length;
  },
};
