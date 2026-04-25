import { useEffect, useRef } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { normalizeAiTutorPersona } from '@/shared/ai-tutor/persona';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createViewerQueryClient } from '@/shared/api/queryClient';
import { prefetchHomePayload, prefetchLibraryCatalog } from '@/shared/api/viewer/prefetch';
import { registerViewerPushWorker } from '@/shared/api/viewer/pushApi';
import { fetchViewerSettings, saveAccountSystemSettings } from '@/shared/api/viewer/settingsApi';
import { FeatureFlagsProvider } from '@/shared/platform/FeatureFlagsProvider';
import { captureViewerError } from '@/shared/platform/observability';
import { patchPreferences } from '@/shared/state/preferencesSlice';
import { store, useAppDispatch, useAppSelector } from '@/shared/state/store';
import { normalizeViewerLanguage } from '@/shared/i18n/locale';

const queryClient = createViewerQueryClient();

function normalizeThemePreference(value: unknown) {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

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
  const themeMode = useAppSelector((state) => state.viewerPreferences.themeMode);
  const language = useAppSelector((state) => state.viewerPreferences.language);
  const aiTutorPersona = useAppSelector((state) => state.viewerPreferences.aiTutorPersona);
  const homeCompanionEnabled = useAppSelector((state) => state.viewerPreferences.homeCompanionEnabled);
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
        const bundle = await fetchViewerSettings(auth.user?.id ?? '');
        const data = bundle.userSettings;
        if (!active) {
          return;
        }

        const hasExplicitLanguage = typeof data?.language === 'string' && data.language.trim().length > 0;
        if (hasExplicitLanguage) {
          const accountLanguage = normalizeViewerLanguage(data?.language);
          const accountThemeMode = normalizeThemePreference(data?.theme_mode);
          const accountAiTutorPersona = normalizeAiTutorPersona(data?.ai_tutor_persona);
          const accountHomeCompanionEnabled = data?.home_companion_enabled !== false;
          syncStateRef.current = {
            ready: true,
            userId: auth.user?.id ?? null,
            persistedLanguage: accountLanguage,
          };
          if (
            accountLanguage !== language ||
            accountThemeMode !== themeMode ||
            accountAiTutorPersona !== aiTutorPersona ||
            accountHomeCompanionEnabled !== homeCompanionEnabled
          ) {
            dispatch(
              patchPreferences({
                language: accountLanguage,
                themeMode: accountThemeMode,
                aiTutorPersona: accountAiTutorPersona,
                homeCompanionEnabled: accountHomeCompanionEnabled,
              }),
            );
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

function ViewerWarmup() {
  const queryClient = useQueryClient();
  const auth = useAppSelector((state) => state.auth);
  const warmedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      return;
    }

    if (auth.loading || !auth.user?.id) {
      warmedUserRef.current = null;
      return;
    }

    if (warmedUserRef.current === auth.user.id) {
      return;
    }

    warmedUserRef.current = auth.user.id;
    prefetchHomePayload(queryClient, auth.user.id, null, { idle: true });
    prefetchLibraryCatalog(queryClient, { searchQuery: '', subjectId: null }, { idle: true });
  }, [auth.loading, auth.user?.id, queryClient]);

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
            <ViewerWarmup />
            {children}
          </AuthProvider>
        </FeatureFlagsProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
