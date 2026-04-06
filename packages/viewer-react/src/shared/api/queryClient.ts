import { QueryClient } from '@tanstack/react-query';

function canRetryRequest(error: unknown) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (!(error instanceof Error)) {
    return true;
  }
  return !/unauthorized|forbidden|jwt|auth/i.test(error.message);
}

export function createViewerQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 10 * 60_000,
        staleTime: 60_000,
        retry: (failureCount, error) => canRetryRequest(error) && failureCount < 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  queryClient.setQueryDefaults(['viewer', 'subjects'], { staleTime: 10 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'courses'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'home'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'course'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'lesson'], { staleTime: 15 * 60_000, retry: 0 });
  queryClient.setQueryDefaults(['viewer', 'community'], { staleTime: 15_000, refetchOnWindowFocus: true });
  queryClient.setQueryDefaults(['viewer', 'parent-children'], { staleTime: 30_000 });
  queryClient.setQueryDefaults(['viewer', 'parent-report'], { staleTime: 30_000 });
  queryClient.setQueryDefaults(['viewer', 'profile'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'stats'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'xp-history'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'achievements'], { staleTime: 5 * 60_000 });
  queryClient.setQueryDefaults(['dashboard-analytics'], { staleTime: 30_000, refetchOnWindowFocus: true });

  return queryClient;
}
