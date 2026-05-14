import {
  GEMINI_DEFAULT_MODEL,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL_CANDIDATES,
} from './geminiModels.ts';

Deno.test('Gemini model defaults use 2.5 Pro with 3.1 Pro fallback', () => {
  if (GEMINI_DEFAULT_MODEL !== 'gemini-2.5-pro') {
    throw new Error(`unexpected default Gemini model: ${GEMINI_DEFAULT_MODEL}`);
  }
  if (GEMINI_FALLBACK_MODEL !== 'gemini-3.1-pro-preview') {
    throw new Error(`unexpected fallback Gemini model: ${GEMINI_FALLBACK_MODEL}`);
  }
  if (GEMINI_MODEL_CANDIDATES.join(',') !== 'gemini-2.5-pro,gemini-3.1-pro-preview') {
    throw new Error(`unexpected Gemini model order: ${GEMINI_MODEL_CANDIDATES.join(',')}`);
  }
});

