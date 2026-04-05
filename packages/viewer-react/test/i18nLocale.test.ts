import { afterEach, describe, expect, it } from 'vitest';
import { formatViewerDate, formatViewerWeekday } from '@/shared/i18n/format';
import { detectBrowserViewerLanguage, detectViewerLanguage, normalizeViewerLanguage } from '@/shared/i18n/locale';

const originalNavigatorLanguage = navigator.language;
const originalNavigatorLanguages = navigator.languages;

function mockNavigatorLanguage(language: string, languages?: string[]) {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  });
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages ?? [language],
  });
}

afterEach(() => {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: originalNavigatorLanguage,
  });
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: originalNavigatorLanguages,
  });
});

describe('i18n locale helpers', () => {
  it('normalizes supported language values', () => {
    expect(normalizeViewerLanguage('zh')).toBe('zh-CN');
    expect(normalizeViewerLanguage('en-US')).toBe('en');
    expect(normalizeViewerLanguage('fr-FR')).toBe('zh-CN');
  });

  it('detects the product language from browser preferences', () => {
    mockNavigatorLanguage('en-US', ['en-US', 'zh-CN']);
    expect(detectBrowserViewerLanguage()).toBe('en');

    mockNavigatorLanguage('zh-Hans-CN', ['zh-Hans-CN', 'en-US']);
    expect(detectBrowserViewerLanguage()).toBe('zh-CN');

    expect(detectViewerLanguage(['en-GB', 'zh-CN'])).toBe('en');
  });

  it('formats dates and weekdays with the active locale', () => {
    const value = new Date('2026-04-05T12:00:00Z');

    expect(formatViewerDate(value, 'en', { month: 'long' })).toContain('April');
    expect(formatViewerDate(value, 'zh-CN', { month: 'long' })).toContain('月');
    expect(formatViewerWeekday(value, 'en')).not.toBe(formatViewerWeekday(value, 'zh-CN'));
  });
});
