import { QueryClient } from '@tanstack/react-query';

function readErrorMetadata(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { code: '', status: Number.NaN, message: '' };
  }

  const record = error as Record<string, unknown>;
  return {
    code: typeof record.code === 'string' ? record.code : '',
    status: typeof record.status === 'number' ? record.status : Number.NaN,
    message: typeof record.message === 'string' ? record.message : '',
  };
}

function canRetryRequest(error: unknown) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  const { code, status, message } = readErrorMetadata(error);
  if (status === 404 || code === 'PGRST205') {
    return false;
  }
  if (!(error instanceof Error)) {
    return !/unauthorized|forbidden|jwt|auth/i.test(message);
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
  queryClient.setQueryDefaults(['viewer', 'profile'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'stats'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'xp-history'], { staleTime: 2 * 60_000 });
  queryClient.setQueryDefaults(['viewer', 'achievements'], { staleTime: 5 * 60_000 });
  queryClient.setQueryDefaults(['dashboard-analytics'], { staleTime: 30_000, refetchOnWindowFocus: true });

  return queryClient;
}
