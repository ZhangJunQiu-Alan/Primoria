type GeminiPart = {
  text?: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

function extractBalancedJsonObject(text: string) {
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let isEscaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (char === '\\') {
          isEscaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        depth += 1;
        continue;
      }

      if (char !== '}') {
        continue;
      }

      depth -= 1;
      if (depth !== 0) {
        continue;
      }

      const candidate = text.slice(start, index + 1).trim();
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return candidate;
        }
      } catch {
        break;
      }
      break;
    }
  }

  return null;
}

function normalizeGeneratedText(text: string) {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1];
  const normalized = (fenced ?? trimmed).trim();
  return (extractBalancedJsonObject(normalized) ?? normalized).trim();
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
