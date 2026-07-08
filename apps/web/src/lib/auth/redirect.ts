export const DEFAULT_AUTH_REDIRECT = "/library";

const APP_REDIRECT_BASE = "https://primoria.local";

export function normalizeAuthRedirect(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return DEFAULT_AUTH_REDIRECT;
  if (!raw.startsWith("/")) return DEFAULT_AUTH_REDIRECT;

  try {
    const url = new URL(raw, APP_REDIRECT_BASE);
    if (url.origin !== APP_REDIRECT_BASE) return DEFAULT_AUTH_REDIRECT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
