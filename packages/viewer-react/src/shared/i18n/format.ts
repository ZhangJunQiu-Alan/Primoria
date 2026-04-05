import { DEFAULT_VIEWER_LANGUAGE, type ViewerLanguage, viewerLanguageToLocale } from '@/shared/i18n/locale';

type DateValue = Date | number | string;

function toDate(value: DateValue) {
  return value instanceof Date ? value : new Date(value);
}

export function formatViewerDate(
  value: DateValue,
  language: ViewerLanguage = DEFAULT_VIEWER_LANGUAGE,
  options?: Intl.DateTimeFormatOptions,
) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(viewerLanguageToLocale(language), options).format(date);
}

export function formatViewerMonthYear(value: DateValue, language: ViewerLanguage = DEFAULT_VIEWER_LANGUAGE) {
  return formatViewerDate(value, language, {
    year: 'numeric',
    month: 'long',
  });
}

export function formatViewerDateTime(
  value: DateValue,
  language: ViewerLanguage = DEFAULT_VIEWER_LANGUAGE,
  options?: Intl.DateTimeFormatOptions,
) {
  return formatViewerDate(value, language, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function formatViewerWeekday(value: DateValue, language: ViewerLanguage = DEFAULT_VIEWER_LANGUAGE) {
  return formatViewerDate(value, language, { weekday: 'short' });
}

export function formatViewerNumber(value: number, language: ViewerLanguage = DEFAULT_VIEWER_LANGUAGE) {
  return new Intl.NumberFormat(viewerLanguageToLocale(language)).format(value);
}
