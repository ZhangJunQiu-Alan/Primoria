import { useAppSelector } from '@/shared/state/store';

export function useProductLanguage() {
  return useAppSelector((state) => state.viewerPreferences.language);
}
