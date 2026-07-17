const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const PHONE = /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/g;
const LONG_IDENTIFIER = /\b[A-Za-z0-9_-]{24,}\b/g;

export function sanitizeVisualizationTelemetryText(value: string, maxLength: number): string {
  return value
    .normalize("NFKC")
    .replace(EMAIL, "[email]")
    .replace(URL, "[url]")
    .replace(PHONE, "[number]")
    .replace(LONG_IDENTIFIER, "[identifier]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function shouldPruneVisualizationTelemetry(eventId: string): boolean {
  let hash = 0;
  for (const character of eventId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 64 === 0;
}
