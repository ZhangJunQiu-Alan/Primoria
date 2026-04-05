const DEFAULT_AUTH_RETURN_TO = '/home';

function readAppBasePath() {
  const baseUrl = import.meta.env.BASE_URL?.trim() || '/';
  if (!baseUrl || baseUrl === '/') {
    return '/';
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function sanitizeReturnTo(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  return trimmed;
}

export function buildLoginPath(returnTo?: string | null) {
  const next = sanitizeReturnTo(returnTo);
  if (!next) {
    return '/login';
  }

  return `/login?returnTo=${encodeURIComponent(next)}`;
}

export function readReturnTo(search: string, fallback = DEFAULT_AUTH_RETURN_TO) {
  const params = new URLSearchParams(search);
  return sanitizeReturnTo(params.get('returnTo')) ?? fallback;
}

export function buildAuthCallbackUrl(returnTo?: string | null) {
  const url = new URL(`${readAppBasePath()}auth/callback`, window.location.origin);
  const next = sanitizeReturnTo(returnTo);
  if (next) {
    url.searchParams.set('returnTo', next);
  }
  return url.toString();
}
