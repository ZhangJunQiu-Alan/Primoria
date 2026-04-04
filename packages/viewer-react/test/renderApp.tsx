import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { setSession, clearSession } from '@/features/auth/authSlice';
import { ViewerRoutes } from '@/app/router';
import { createViewerQueryClient } from '@/shared/api/queryClient';
import { FeatureFlagsProvider } from '@/shared/platform/FeatureFlagsProvider';
import { createAppStore, useAppSelector } from '@/shared/state/store';
import { DEMO_ROLE_STORAGE_KEY } from '@/shared/utils/demoMode';

function LocationCapture({ onChange }: { onChange: (pathname: string) => void }) {
  const location = useLocation();

  useEffect(() => {
    onChange(location.pathname);
  }, [location.pathname, onChange]);

  return null;
}

function TestPreferenceSynchronizer() {
  const themeMode = useAppSelector((state) => state.viewerPreferences.themeMode);
  const language = useAppSelector((state) => state.viewerPreferences.language);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themeMode === 'system' ? '' : themeMode;
    root.lang = language;
  }, [language, themeMode]);

  return null;
}

export function renderRoute(route: string, role: string | null = null) {
  if (role) {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
  } else {
    window.localStorage.removeItem(DEMO_ROLE_STORAGE_KEY);
  }

  const store = createAppStore();
  if (role) {
    store.dispatch(
      setSession({
        user: {
          id: 'demo-user',
          email: `${role}@demo.primoria.dev`,
          displayName: role === 'parent' ? 'Demo Parent' : 'Demo Learner',
        },
        role,
        source: 'demo',
      }),
    );
  } else {
    store.dispatch(clearSession());
  }

  const queryClient = createViewerQueryClient();
  const locationRef = { pathname: route };

  return {
    store,
    queryClient,
    locationRef,
    ...render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <FeatureFlagsProvider>
            <TestPreferenceSynchronizer />
            <MemoryRouter initialEntries={[route]}>
              <LocationCapture
                onChange={(pathname) => {
                  locationRef.pathname = pathname;
                }}
              />
              <ViewerRoutes />
            </MemoryRouter>
          </FeatureFlagsProvider>
        </QueryClientProvider>
      </Provider>,
    ),
  };
}
