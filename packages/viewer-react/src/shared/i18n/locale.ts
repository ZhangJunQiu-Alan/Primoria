export const SUPPORTED_VIEWER_LANGUAGES = ['zh-CN', 'en'] as const;

export type ViewerLanguage = (typeof SUPPORTED_VIEWER_LANGUAGES)[number];

export const DEFAULT_VIEWER_LANGUAGE: ViewerLanguage = 'zh-CN';

export function normalizeViewerLanguage(value: unknown): ViewerLanguage {
  if (typeof value !== 'string') {
    return DEFAULT_VIEWER_LANGUAGE;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_VIEWER_LANGUAGE;
  }
  if (normalized.startsWith('zh')) {
    return 'zh-CN';
  }
  if (normalized.startsWith('en')) {
    return 'en';
  }
  return DEFAULT_VIEWER_LANGUAGE;
}

export function detectViewerLanguage(input?: readonly string[] | string | null): ViewerLanguage {
  if (Array.isArray(input)) {
    for (const candidate of input) {
      const resolved = normalizeViewerLanguage(candidate);
      if (candidate && resolved) {
        return resolved;
      }
    }
    return DEFAULT_VIEWER_LANGUAGE;
  }

  return normalizeViewerLanguage(input);
}

export function detectBrowserViewerLanguage(): ViewerLanguage {
  if (typeof navigator === 'undefined') {
    return DEFAULT_VIEWER_LANGUAGE;
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return detectViewerLanguage(navigator.languages);
  }

  return detectViewerLanguage(navigator.language);
}

export function viewerLanguageToLocale(language: ViewerLanguage) {
  return language === 'zh-CN' ? 'zh-CN' : 'en-US';
}

export function viewerLanguageLabel(language: ViewerLanguage) {
  return language === 'zh-CN' ? '中文' : 'English';
}
