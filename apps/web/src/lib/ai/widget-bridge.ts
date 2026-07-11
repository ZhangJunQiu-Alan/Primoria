export const WIDGET_IFRAME_SANDBOX = "allow-scripts";
export const WIDGET_PROMPT_MAX_LENGTH = 2_000;
export const WIDGET_EXTERNAL_URL_MAX_LENGTH = 2_048;

export function normalizeWidgetExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input || input.length > WIDGET_EXTERNAL_URL_MAX_LENGTH) return null;

  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}
