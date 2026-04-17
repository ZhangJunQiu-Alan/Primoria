import { DEFAULT_VIEWER_LANGUAGE, type ViewerLanguage } from '@/shared/i18n/locale';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';

export type LocalizedDictionary<T> = Record<ViewerLanguage, T>;

export type DeepWiden<T> =
  T extends string ? string
  : T extends readonly (infer U)[] ? readonly DeepWiden<U>[]
  : T extends object ? { [K in keyof T]: DeepWiden<T[K]> }
  : T;

export function getLocalizedDictionary<T extends object>(
  dictionary: LocalizedDictionary<T>,
  language: ViewerLanguage = DEFAULT_VIEWER_LANGUAGE,
) {
  return dictionary[language] as DeepWiden<T>;
}

export function useLocalizedDictionary<T extends object>(dictionary: LocalizedDictionary<T>) {
  return getLocalizedDictionary(dictionary, useProductLanguage());
}
