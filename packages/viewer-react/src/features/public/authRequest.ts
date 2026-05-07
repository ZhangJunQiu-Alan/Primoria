const AUTH_RETRY_DELAY_MS = 450;
const AUTH_RETRY_ATTEMPTS = 2;

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function isAuthNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('load failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('network error') ||
    normalized.includes('err_network')
  );
}

export async function runAuthRequest<TResponse>(
  request: () => Promise<TResponse>,
): Promise<TResponse> {
  let latestError: unknown;

  for (let attempt = 0; attempt <= AUTH_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      latestError = error;
      if (!isAuthNetworkError(error) || attempt === AUTH_RETRY_ATTEMPTS) {
        throw error;
      }

      await delay(AUTH_RETRY_DELAY_MS);
    }
  }

  throw latestError;
}

export function getAuthFailureMessage(error: unknown, networkFallback: string) {
  if (isAuthNetworkError(error)) {
    return networkFallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return networkFallback;
}
