export type StemSubject = "physics" | "math" | "cs";

export type StemCodeValidation =
  | { ok: true }
  | { ok: false; reason: string };

const STEM_DENY_RULES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bimport\s*(?:\(|["'`*{]|\w)/, reason: "imports are not allowed in STEM renderer code" },
  { pattern: /\bexport\s+(?:default|const|let|var|function|class|\{)/, reason: "exports are not allowed in STEM renderer code" },
  { pattern: /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/, reason: "network APIs are not allowed in STEM renderer code" },
  { pattern: /\bnavigator\s*\.\s*sendBeacon\b/, reason: "network APIs are not allowed in STEM renderer code" },
  { pattern: /\b(?:eval|Function)\s*\(/, reason: "dynamic code execution is not allowed in generated STEM code" },
  { pattern: /\b(?:document|window|globalThis|self)\s*\./, reason: "raw DOM/window access is not allowed in STEM renderer code" },
  { pattern: /\b(?:localStorage|sessionStorage|indexedDB|caches)\b/, reason: "browser storage APIs are not allowed in STEM renderer code" },
  { pattern: /\bcreateElement\s*\(\s*["'`]script["'`]\s*\)/, reason: "dynamic script creation is not allowed in STEM renderer code" },
  { pattern: /(?:__proto__|prototype|constructor)\s*(?:\.|\[)/, reason: "prototype/constructor access is not allowed in STEM renderer code" },
];

export function validateStemCode(code: string): StemCodeValidation {
  const source = String(code ?? "").trim();
  if (!source) return { ok: false, reason: "STEM renderer code is empty" };
  if (source.length > 16_000) return { ok: false, reason: "STEM renderer code is too large" };

  for (const rule of STEM_DENY_RULES) {
    if (rule.pattern.test(source)) return { ok: false, reason: rule.reason };
  }

  return { ok: true };
}

export function assertValidStemCode(code: string): void {
  const result = validateStemCode(code);
  if (!result.ok) throw new Error(result.reason);
}
