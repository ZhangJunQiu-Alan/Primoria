import {
  extractGeminiCandidateTexts,
  extractNormalizedGeminiCandidateTexts,
} from './geminiResponse.ts';

function assertEquals<T>(actual: T, expected: T, label?: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${label ? label + ': ' : ''}expected ${b}, got ${a}`);
  }
}

function makePayload(...texts: string[]) {
  return {
    candidates: texts.map((text) => ({
      content: { parts: [{ text }] },
    })),
  };
}

// ── extractGeminiCandidateTexts ──────────────────────────────────────────────

Deno.test('extractGeminiCandidateTexts: returns empty array for no candidates', () => {
  assertEquals(extractGeminiCandidateTexts({ candidates: [] }), []);
});

Deno.test('extractGeminiCandidateTexts: returns empty array when candidates key missing', () => {
  assertEquals(extractGeminiCandidateTexts({}), []);
});

Deno.test('extractGeminiCandidateTexts: extracts single candidate text', () => {
  const result = extractGeminiCandidateTexts(makePayload('hello world'));
  assertEquals(result, ['hello world']);
});

Deno.test('extractGeminiCandidateTexts: extracts multiple candidates', () => {
  const result = extractGeminiCandidateTexts(makePayload('first', 'second'));
  assertEquals(result, ['first', 'second']);
});

Deno.test('extractGeminiCandidateTexts: skips candidates with no parts', () => {
  const payload = {
    candidates: [
      { content: { parts: [] } },
      { content: { parts: [{ text: 'valid' }] } },
    ],
  };
  assertEquals(extractGeminiCandidateTexts(payload), ['valid']);
});

Deno.test('extractGeminiCandidateTexts: skips candidates with missing content', () => {
  const payload = { candidates: [{ content: undefined }, { content: { parts: [{ text: 'ok' }] } }] };
  assertEquals(extractGeminiCandidateTexts(payload as Record<string, unknown>), ['ok']);
});

Deno.test('extractGeminiCandidateTexts: ignores non-string part text', () => {
  const payload = { candidates: [{ content: { parts: [{ text: 42 }, { text: 'real' }] } }] };
  assertEquals(extractGeminiCandidateTexts(payload as Record<string, unknown>), ['real']);
});

// ── extractNormalizedGeminiCandidateTexts ────────────────────────────────────

Deno.test('extractNormalizedGeminiCandidateTexts: plain JSON passes through', () => {
  const json = '{"key":"value"}';
  assertEquals(extractNormalizedGeminiCandidateTexts(makePayload(json)), [json]);
});

Deno.test('extractNormalizedGeminiCandidateTexts: strips markdown json fence', () => {
  const wrapped = '```json\n{"key":"value"}\n```';
  assertEquals(extractNormalizedGeminiCandidateTexts(makePayload(wrapped)), ['{"key":"value"}']);
});

Deno.test('extractNormalizedGeminiCandidateTexts: strips generic code fence', () => {
  const wrapped = '```\n{"key":"value"}\n```';
  assertEquals(extractNormalizedGeminiCandidateTexts(makePayload(wrapped)), ['{"key":"value"}']);
});

Deno.test('extractNormalizedGeminiCandidateTexts: extracts JSON from surrounding prose', () => {
  const wrapped = 'Here is the answer:\n{"reply":"Focus on productivity."}\nThanks!';
  assertEquals(extractNormalizedGeminiCandidateTexts(makePayload(wrapped)), ['{"reply":"Focus on productivity."}']);
});

Deno.test('extractNormalizedGeminiCandidateTexts: returns empty array for empty response', () => {
  assertEquals(extractNormalizedGeminiCandidateTexts({ candidates: [] }), []);
});

Deno.test('extractNormalizedGeminiCandidateTexts: trims surrounding whitespace', () => {
  const result = extractNormalizedGeminiCandidateTexts(makePayload('  {"a":1}  '));
  assertEquals(result, ['{"a":1}']);
});

Deno.test('extractNormalizedGeminiCandidateTexts: filters out empty strings after normalization', () => {
  const result = extractNormalizedGeminiCandidateTexts(makePayload('```json\n\n```', '{"valid":true}'));
  assertEquals(result, ['{"valid":true}']);
});
