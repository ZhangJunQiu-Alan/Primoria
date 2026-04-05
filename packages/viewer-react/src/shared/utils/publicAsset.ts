function normalizeBaseUrl() {
  const baseUrl = import.meta.env.BASE_URL?.trim() || '/';
  if (baseUrl === '/') {
    return '/';
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function publicAssetPath(path: string) {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizeBaseUrl()}${normalizedPath}`;
}

export function publicBasePath() {
  return normalizeBaseUrl();
}
