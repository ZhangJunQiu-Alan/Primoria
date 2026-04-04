import { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createViewerQueryClient } from '@/shared/api/queryClient';
import { registerViewerPushWorker } from '@/shared/api/viewer/pushApi';
import { FeatureFlagsProvider } from '@/shared/platform/FeatureFlagsProvider';
import { store, useAppSelector } from '@/shared/state/store';

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

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <FeatureFlagsProvider>
          <AuthProvider>
            <ThemeSynchronizer />
            {children}
          </AuthProvider>
        </FeatureFlagsProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
