import { z } from 'npm:zod@3.25.76';

const HEX_6 = /^#([0-9a-fA-F]{6})$/;
const HEX_8 = /^#([0-9a-fA-F]{6})[0-9a-fA-F]{2}$/;
const HEX_3 = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX_4 = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])[0-9a-fA-F]$/;
const RGB_FN = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/;

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  let match = HEX_6.exec(trimmed);
  if (match) return `#${match[1].toLowerCase()}`;
  match = HEX_8.exec(trimmed);
  if (match) return `#${match[1].toLowerCase()}`;
  match = HEX_3.exec(trimmed);
  if (match) {
    const r = match[1].repeat(2);
    const g = match[2].repeat(2);
    const b = match[3].repeat(2);
    return `#${(r + g + b).toLowerCase()}`;
  }
  match = HEX_4.exec(trimmed);
  if (match) {
    const r = match[1].repeat(2);
    const g = match[2].repeat(2);
    const b = match[3].repeat(2);
    return `#${(r + g + b).toLowerCase()}`;
  }
  match = RGB_FN.exec(trimmed);
  if (match) {
    const channels = [match[1], match[2], match[3]].map((n) => {
      const value = parseInt(n, 10);
      if (!Number.isFinite(value) || value < 0 || value > 255) return null;
      return value;
    });
    if (channels.some((c) => c === null)) return null;
    return `#${(channels as number[]).map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }
  return null;
}

const ColorSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeHexColor(value);
  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid color "${value}". Use a 6-digit hex literal like #2563eb (3-digit shorthand, rgb(), and rgba() are also accepted).`,
    });
    return z.NEVER;
  }
  return normalized;
});

export const PlanSchema = z.object({
  approach: z.string().min(20).max(800),
  technology: z.enum(['svg', 'canvas2d', 'three', 'd3', 'chartjs', 'css-anim', 'hybrid']),
  template: z.string().min(2).max(60),
  palette: z.object({
    mode: z.enum(['light', 'dark', 'auto']).default('auto'),
    primary: ColorSchema,
    accent: ColorSchema,
    surface: ColorSchema.optional(),
  }),
  keyElements: z.array(z.string().min(2)).min(2).max(8),
  interactions: z
    .array(
      z.object({
        control: z.string().min(2),
        purpose: z.string().min(2),
      }),
    )
    .min(1)
    .max(8),
  accessibilityNotes: z.array(z.string().min(2)).min(1).max(6),
  observationCopyHint: z.string().min(2).max(280),
});

export type Plan = z.infer<typeof PlanSchema>;

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)?.[1];
  return (fenced ?? trimmed).trim();
}

type ExtractResult =
  | { ok: true; json: string }
  | { ok: false; reason: 'no-open-brace' | 'truncated' };

function extractFirstJsonObject(text: string): ExtractResult {
  const stripped = stripJsonFence(text);
  const start = stripped.indexOf('{');
  if (start === -1) {
    return { ok: false, reason: 'no-open-brace' };
  }

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
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { ok: true, json: stripped.slice(start, i + 1) };
      }
    }
  }
  return { ok: false, reason: 'truncated' };
}

export class PlanParseError extends Error {
  issues: string[];
  raw: string;
  constructor(message: string, issues: string[], raw: string) {
    super(message);
    this.name = 'PlanParseError';
    this.issues = issues;
    this.raw = raw;
  }
}

export function parsePlanText(raw: string): Plan {
  const extracted = extractFirstJsonObject(raw);
  if (!extracted.ok) {
    if (extracted.reason === 'truncated') {
      throw new PlanParseError(
        'Plan JSON appears truncated (open brace found but no matching close — likely hit output token limit).',
        ['Truncated before closing "}"'],
        raw,
      );
    }
    throw new PlanParseError(
      'Plan response did not contain a JSON object.',
      ['No "{...}" object found in response.'],
      raw,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted.json);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown JSON error';
    throw new PlanParseError(
      'Plan response was not valid JSON.',
      [message],
      raw,
    );
  }

  const result = PlanSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new PlanParseError('Plan JSON did not match the required schema.', issues, raw);
  }
  return result.data;
}
