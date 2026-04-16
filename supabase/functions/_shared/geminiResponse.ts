type GeminiPart = {
  text?: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

function normalizeGeneratedText(text: string) {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1];
  return (fenced ?? trimmed).trim();
}

function extractCandidateText(candidate: GeminiCandidate) {
  const parts = Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

export function extractGeminiCandidateTexts(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? (payload.candidates as GeminiCandidate[]) : [];
  return candidates
    .map((candidate) => extractCandidateText(candidate))
    .filter((text) => text.length > 0);
}

export function extractNormalizedGeminiCandidateTexts(payload: Record<string, unknown>) {
  return extractGeminiCandidateTexts(payload)
    .map((text) => normalizeGeneratedText(text))
    .filter((text) => text.length > 0);
}
