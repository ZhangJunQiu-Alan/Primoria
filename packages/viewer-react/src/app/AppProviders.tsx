import { useEffect, useRef } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createViewerQueryClient } from '@/shared/api/queryClient';
import { registerViewerPushWorker } from '@/shared/api/viewer/pushApi';
import { saveAccountSystemSettings } from '@/shared/api/viewer/settingsApi';
import { FeatureFlagsProvider } from '@/shared/platform/FeatureFlagsProvider';
import { captureViewerError } from '@/shared/platform/observability';
import { patchPreferences } from '@/shared/state/preferencesSlice';
import { store, useAppDispatch, useAppSelector } from '@/shared/state/store';
import { normalizeViewerLanguage } from '@/shared/i18n/locale';
import { supabase } from '@/shared/api/supabase';

const queryClient = createViewerQueryClient();

function ThemeSynchronizer() {
  const themeMode = useAppSelector((state) => state.viewerPreferences.themeMode);
  const language = useAppSelector((state) => state.viewerPreferences.language);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'system') {
      root.dataset.theme = '';
      return;
    }
    root.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    void registerViewerPushWorker();
  }, []);

  return null;
}

function LanguagePreferenceSynchronizer() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const language = useAppSelector((state) => state.viewerPreferences.language);
  const syncStateRef = useRef<{
    ready: boolean;
    userId: string | null;
    persistedLanguage: string | null;
  }>({
    ready: false,
    userId: null,
    persistedLanguage: null,
  });

  useEffect(() => {
    if (auth.source !== 'supabase' || !auth.user?.id) {
      syncStateRef.current = {
        ready: false,
        userId: null,
        persistedLanguage: null,
      };
      return;
    }

    let active = true;

    syncStateRef.current = {
      ready: false,
      userId: auth.user.id,
      persistedLanguage: null,
    };

    async function hydrateLanguagePreference() {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('language')
          .eq('user_id', auth.user?.id ?? '')
          .maybeSingle();

        if (error) {
          throw error;
        }
        if (!active) {
          return;
        }

        const hasExplicitLanguage = typeof data?.language === 'string' && data.language.trim().length > 0;
        if (hasExplicitLanguage) {
          const accountLanguage = normalizeViewerLanguage(data?.language);
          syncStateRef.current = {
            ready: true,
            userId: auth.user?.id ?? null,
            persistedLanguage: accountLanguage,
          };
          if (accountLanguage !== language) {
            dispatch(patchPreferences({ language: accountLanguage }));
          }
          return;
        }

        await saveAccountSystemSettings(auth.user?.id ?? '', { language });
        if (!active) {
          return;
        }

        syncStateRef.current = {
          ready: true,
          userId: auth.user?.id ?? null,
          persistedLanguage: language,
        };
      } catch (error) {
        captureViewerError(error, { area: 'language_preference_hydration' });
      }
    }

    void hydrateLanguagePreference();

    return () => {
      active = false;
    };
  }, [auth.source, auth.user?.id, dispatch]);

  useEffect(() => {
    if (
      auth.source !== 'supabase' ||
      !auth.user?.id ||
      !syncStateRef.current.ready ||
      syncStateRef.current.userId !== auth.user.id ||
      syncStateRef.current.persistedLanguage === language
    ) {
      return;
    }

    let active = true;

    void saveAccountSystemSettings(auth.user.id, { language })
      .then(() => {
        if (!active) {
          return;
        }
        syncStateRef.current.persistedLanguage = language;
      })
      .catch((error) => {
        captureViewerError(error, { area: 'language_preference_persist' });
      });

    return () => {
      active = false;
    };
  }, [auth.source, auth.user?.id, language]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <FeatureFlagsProvider>
          <AuthProvider>
            <ThemeSynchronizer />
            <LanguagePreferenceSynchronizer />
            {children}
          </AuthProvider>
        </FeatureFlagsProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
