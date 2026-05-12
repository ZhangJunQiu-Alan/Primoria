import { z } from 'npm:zod@3.25.76';
import {
  callGeminiOnce,
  type GenerationErrorKind,
} from './geminiCall.ts';
import type { Plan } from './planSchema.ts';

const AUDIT_TEMPERATURE = 0.2;
const AUDIT_MAX_OUTPUT_TOKENS = 1_024;

export const GEMINI_AUDIT_MODELS = [
  'gemini-2.5-pro-latest',
  'gemini-2.5-pro',
  'gemini-2.5-flash-latest',
  'gemini-2.5-flash',
];

const AUDIT_SYSTEM_INSTRUCTION =
  'You are a strict reviewer of AI-generated interactive educational HTML. Return ONLY one JSON object. No markdown, no commentary.';

export const LlmAuditSchema = z.object({
  verdict: z.enum(['pass', 'repair']),
  issues: z
    .array(
      z.object({
        severity: z.enum(['blocker', 'warning']),
        category: z.string().min(2).max(60),
        message: z.string().min(2).max(400),
      }),
    )
    .max(10),
});

export type LlmAuditReport = z.infer<typeof LlmAuditSchema>;

export class AuditParseError extends Error {
  issues: string[];
  raw: string;
  constructor(message: string, issues: string[], raw: string) {
    super(message);
    this.name = 'AuditParseError';
    this.issues = issues;
    this.raw = raw;
  }
}

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)?.[1];
  return (fenced ?? trimmed).trim();
}

function extractFirstJsonObject(text: string): string | null {
  const stripped = stripJsonFence(text);
  const start = stripped.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escape = false;
  for (let i = start; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return stripped.slice(start, i + 1);
    }
  }
  return null;
}

export function parseAuditText(raw: string): LlmAuditReport {
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) {
    throw new AuditParseError(
      'Audit response did not contain a JSON object.',
      ['No "{...}" object found.'],
      raw,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new AuditParseError(
      'Audit response was not valid JSON.',
      [error instanceof Error ? error.message : 'unknown JSON error'],
      raw,
    );
  }
  const result = LlmAuditSchema.safeParse(parsed);
  if (!result.success) {
    throw new AuditParseError(
      'Audit JSON did not match the required schema.',
      result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
      raw,
    );
  }
  return result.data;
}

export function buildAuditPrompt(args: {
  userPrompt: string;
  plan: Plan;
  html: string;
}): string {
  return `You are auditing an AI-generated interactive educational HTML document.

LEARNER REQUEST:
${args.userPrompt.trim()}

LOCKED PLAN (the renderer was told to implement this exactly):
${JSON.stringify(args.plan, null, 2)}

GENERATED HTML:
${args.html}

Return ONE JSON object with shape:
{
  "verdict": "pass" | "repair",
  "issues": [
    { "severity": "blocker" | "warning", "category": "<short tag>", "message": "<concrete actionable issue, <= 300 chars>" }
  ]
}

Audit checklist (verdict "repair" if ANY blocker is present):
1. Plan implementation: every plan.keyElement has a VISIBLE, identifiable counterpart in the HTML (e.g. "Numerical labels on bars" requires actual <text> nodes — aria-label alone is insufficient).
2. Interactions wired: every plan.interaction has a working event listener that updates the visualization AND produces a visible reaction.
3. Live observation: the observation strip / .iv-observation-card / .iv-conclusion text updates on interaction events.
4. Runtime safety: scan for likely runtime errors — undefined variable references, off-by-one in array indexing, gsap.to misuse, dom queries against missing ids.
5. Palette adherence: plan.palette.primary and plan.palette.accent are visibly used for accent colors (not overridden by ad-hoc hex values).
6. Accessibility: every interactive control has an aria-label (or visible text label tied via <label for>).

Issue categories (pick one):
- missing-keyElement       (something in plan.keyElements not visibly implemented)
- broken-interaction       (interaction declared in plan but not wired or won't produce visible feedback)
- observation-not-live     (observation strip is static or won't update)
- plan-mismatch            (HTML deviates from plan in template/technology/palette)
- runtime-error            (likely JavaScript error at runtime)
- accessibility            (missing aria-label, low contrast, keyboard inaccessible)
- other                    (anything else that makes the visualization unusable or significantly worse than the plan)

Severity rules:
- "blocker" — a real user opening this in a browser would see a broken or critically incomplete result
- "warning" — works, but flawed in a way worth fixing

Do NOT verdict "repair" for stylistic preferences. Only when the result would degrade the user's experience.

Return ONLY the JSON object. No prose, no markdown fences.`;
}

export type AuditOutcome =
  | { ok: true; report: LlmAuditReport }
  | { ok: false; reason: 'auditor-unavailable'; message: string };

export async function auditHtmlWithLLM(args: {
  apiKey: string;
  userPrompt: string;
  plan: Plan;
  html: string;
}): Promise<AuditOutcome> {
  const prompt = buildAuditPrompt({
    userPrompt: args.userPrompt,
    plan: args.plan,
    html: args.html,
  });
  let lastError = 'LLM audit failed.';
  let lastKind: GenerationErrorKind = 'fatal';

  for (const model of GEMINI_AUDIT_MODELS) {
    const res = await callGeminiOnce({
      apiKey: args.apiKey,
      model,
      systemInstruction: AUDIT_SYSTEM_INSTRUCTION,
      prompt,
      temperature: AUDIT_TEMPERATURE,
      maxOutputTokens: AUDIT_MAX_OUTPUT_TOKENS,
    });
    if (!res.ok) {
      lastError = res.message;
      lastKind = res.transient ? 'transient' : 'fatal';
      continue;
    }
    for (const text of res.candidateTexts) {
      try {
        const report = parseAuditText(text);
        return { ok: true, report };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Audit parse failed.';
        lastKind = 'validation';
      }
    }
  }

  return {
    ok: false,
    reason: 'auditor-unavailable',
    message: `${lastError} (kind=${lastKind})`,
  };
}
