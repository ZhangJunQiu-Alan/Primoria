import { extractGeminiCandidateTexts } from '../_shared/geminiResponse.ts';

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_MODEL = 'gemini-2.0-flash';
export const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
export const GEMINI_MODELS = [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_MODEL)];

export const GEMINI_PLAN_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.5-pro-latest',
  'gemini-2.5-pro',
];

export const GEMINI_RENDER_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.5-pro-latest',
  'gemini-2.5-pro',
];

export type GenerationStep = 'plan' | 'render';
export type GenerationErrorKind = 'transient' | 'validation' | 'fatal';

export class GenerationAttemptError extends Error {
  kind: GenerationErrorKind;
  httpStatus?: number;
  step?: GenerationStep;

  constructor(message: string, kind: GenerationErrorKind, httpStatus?: number, step?: GenerationStep) {
    super(message);
    this.name = 'GenerationAttemptError';
    this.kind = kind;
    this.httpStatus = httpStatus;
    this.step = step;
  }
}

export function isGenerationAttemptError(error: unknown): error is GenerationAttemptError {
  return error instanceof GenerationAttemptError;
}

export function isTransientGeminiStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export type GeminiCallResult =
  | { ok: true; candidateTexts: string[] }
  | { ok: false; status?: number; message: string; transient: boolean };

export async function callGeminiOnce(args: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
}): Promise<GeminiCallResult> {
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${args.model}:generateContent?key=${args.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: args.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
        generationConfig: {
          temperature: args.temperature,
          maxOutputTokens: args.maxOutputTokens,
        },
      }),
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: `Gemini returned HTTP ${response.status}.`,
      transient: isTransientGeminiStatus(response.status),
    };
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const candidateTexts = extractGeminiCandidateTexts(raw);
  if (!candidateTexts.length) {
    return { ok: false, message: 'Gemini returned an empty response.', transient: true };
  }
  return { ok: true, candidateTexts };
}
