const FENCED_BLOCK_RE = /```[ \t]*([a-zA-Z0-9_-]+)?[ \t]*\r?\n?([\s\S]*?)```/m;

export function normalizeGeminiHtml(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  const fencedMatch = trimmed.match(FENCED_BLOCK_RE);
  if (!fencedMatch) {
    return trimmed;
  }

  return (fencedMatch[2] ?? '').trim();
}
