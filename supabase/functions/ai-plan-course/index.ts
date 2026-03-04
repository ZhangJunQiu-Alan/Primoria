/**
 * POST /functions/v1/ai-plan-course
 *
 * Request body:
 *   {
 *     description:     string,  // user's natural language course request (required)
 *     difficulty?:     string,  // beginner | intermediate | advanced  (default: beginner)
 *     animationStyle?: string,  // cartoon | minimal | realistic       (default: minimal)
 *     language?:       string,  // zh | en                             (default: zh)
 *   }
 *
 * Response (success):
 *   { success: true, planJson: CoursePlanJson, model: string }
 *
 * Response (error):
 *   { success: false, error: string, validationErrors?: PlanValidationError[] }
 */

import type { CoursePlanJson } from '../_shared/types/course_plan.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_OUTPUT_TOKENS = 8192; // plan JSON is much smaller than full course JSON

const MODEL_CANDIDATES = [
  'gemini-2.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro-latest',
  'gemini-2.5-pro',
];

const VALID_SUBJECTS = new Set([
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Engineering',
  'Data Science & AI',
  'Earth & Space Science',
]);

const VALID_DIFFICULTIES    = new Set(['beginner', 'intermediate', 'advanced']);
const VALID_ANIMATION_STYLES = new Set(['cartoon', 'minimal', 'realistic']);
const VALID_LANGUAGES       = new Set(['zh', 'en']);
const VALID_LESSON_TYPES    = new Set(['interactive', 'quiz', 'video', 'article']);

// ────────────────────────────────────────────────────────────────────
// Prompt
// ────────────────────────────────────────────────────────────────────

const PLAN_SYSTEM_PROMPT = `You are an expert instructional designer for Primoria, an interactive STEM learning platform.
Given a course description, produce a structured course plan JSON.

Return JSON only. Do not output markdown, code fences, or explanations.
All strings must use double quotes.

Required JSON structure (exact schema — do NOT add or remove fields):
{
  "schema_version": "plan-1.0",
  "course": {
    "title": "Course title",
    "description": "2-3 sentence description of what students will learn",
    "subject": "<exactly one of the 8 allowed subjects>",
    "difficulty": "beginner",
    "target_audience": "Who this course is designed for",
    "estimated_total_minutes": 90,
    "tags": ["tag1", "tag2", "tag3"],
    "animation_style": "minimal",
    "language": "zh"
  },
  "lessons": [
    {
      "order": 1,
      "title": "Lesson title",
      "objective": "By the end of this lesson, students will be able to...",
      "key_points": ["concept1", "concept2", "concept3"],
      "type": "interactive",
      "estimated_minutes": 15,
      "xp_reward": 50
    }
  ]
}

Hard constraints:
- subject must be exactly one of: "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Engineering", "Data Science & AI", "Earth & Space Science"
- difficulty must be exactly one of: beginner, intermediate, advanced
- animation_style must be exactly one of: cartoon, minimal, realistic
- language must be exactly one of: zh, en
- lesson.type must be exactly one of: interactive, quiz, video, article; most lessons should be "interactive"
- Generate 3-8 lessons. Use 3-4 for short/focused topics, 5-8 for rich/broad topics.
- Each lesson must have exactly 3-6 key_points (strings).
- lesson.order starts at 1 and must be consecutive (1, 2, 3 …).
- lesson.estimated_minutes must be between 10 and 30.
- lesson.xp_reward must be between 30 and 100; longer or harder lessons earn more.
- estimated_total_minutes must equal the sum of all lesson estimated_minutes.
- Lessons must be in a logical learning sequence: fundamentals first, advanced concepts last.`;

function buildPlanPrompt(
  description: string,
  difficulty: string,
  animationStyle: string,
  language: string,
): string {
  return `${PLAN_SYSTEM_PROMPT}

User course request:
"${description.trim()}"

Honour these user preferences:
- Difficulty level: ${difficulty}
- Animation style: ${animationStyle}
- Content language: ${language} (write all titles, descriptions, objectives, and key_points in this language)`;
}

// ────────────────────────────────────────────────────────────────────
// Gemini helpers (self-contained copy; shared extract is a future refactor)
// ────────────────────────────────────────────────────────────────────

interface GeminiResult {
  success: boolean;
  content?: string;
  error?: string;
  statusCode?: number;
}

async function callGemini(
  model: string,
  prompt: string,
  apiKey: string,
): Promise<GeminiResult> {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
    },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { success: false, error: `Network error calling ${model}: ${e}` };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorMessage = `${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson?.error?.message ?? errorMessage;
    } catch (_) {
      if (errorText) errorMessage = errorText;
    }
    return {
      success: false,
      error: `Model ${model} returned ${response.status}: ${errorMessage}`,
      statusCode: response.status,
    };
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch (e) {
    return { success: false, error: `Failed to parse Gemini response: ${e}` };
  }

  const candidates = (data?.candidates as unknown[]) ?? [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const finishReason = first?.finishReason as string | undefined;
  const parts = ((first?.content as Record<string, unknown>)?.parts as unknown[]) ?? [];
  const text = (parts[0] as Record<string, unknown>)?.text as string | undefined;

  if (finishReason === 'MAX_TOKENS') {
    return { success: false, error: `Model ${model} output truncated (MAX_TOKENS)` };
  }
  if (finishReason && finishReason !== 'STOP' && !text?.trim()) {
    return { success: false, error: `Model ${model} did not complete (finishReason=${finishReason})` };
  }
  if (!text?.trim()) {
    return { success: false, error: `Model ${model} returned empty content` };
  }

  const trimmed = text.trimEnd();
  if (!trimmed.endsWith('}')) {
    return {
      success: false,
      error: `Model ${model} output truncated mid-JSON (tail: "...${trimmed.slice(-60).replace(/\n/g, ' ')}")`,
    };
  }

  return { success: true, content: text };
}

function shouldTryNextModel(result: GeminiResult): boolean {
  const code = result.statusCode;
  if (code === 404 || code === 429 || code === 500 || code === 502 || code === 503 || code === 504) return true;
  const msg = (result.error ?? '').toLowerCase();
  if (msg.includes('high demand') || msg.includes('resource_exhausted') || msg.includes('unavailable')) return true;
  if (code === undefined) return true;
  if (code !== 400 && code !== 403) return false;
  return msg.includes('model') && (msg.includes('not found') || msg.includes('unsupported') || msg.includes('not available'));
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const s = text.trim()
    .replace(/\uFF0C/g, ',').replace(/\uFF1A/g, ':')
    .replace(/\u201C|\u201D/g, '"').replace(/\u2018|\u2019/g, "'");

  try {
    const p = JSON.parse(s);
    if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
  } catch (_) {}

  const block = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (block) {
    try {
      const p = JSON.parse(block[1].trim());
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch (_) {}
  }

  const first = s.indexOf('{'), last = s.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      const p = JSON.parse(s.slice(first, last + 1));
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch (_) {}
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────
// Plan JSON validation
// ────────────────────────────────────────────────────────────────────

interface PlanValidationError {
  path: string;
  message: string;
}

interface PlanValidationResult {
  valid: boolean;
  errors: PlanValidationError[];
  summary: string;
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && (v as string).trim().length > 0;
}

function validatePlanJson(json: unknown): PlanValidationResult {
  const errors: PlanValidationError[] = [];

  const err = (path: string, message: string) => errors.push({ path, message });

  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    err('$', 'Plan JSON must be an object');
    return { valid: false, errors, summary: '1 error: $ must be an object' };
  }

  const plan = json as Record<string, unknown>;

  if (plan.schema_version !== 'plan-1.0') {
    err('$.schema_version', `schema_version must be "plan-1.0", got "${plan.schema_version}"`);
  }

  // ── course ──
  const course = plan.course as Record<string, unknown> | undefined;
  if (!course || typeof course !== 'object') {
    err('$.course', 'course object is required');
  } else {
    if (!isStr(course.title))        err('$.course.title',       'title is required');
    if (!isStr(course.description))  err('$.course.description', 'description is required');
    if (!isStr(course.target_audience)) err('$.course.target_audience', 'target_audience is required');

    if (!VALID_SUBJECTS.has(course.subject as string)) {
      err('$.course.subject', `subject "${course.subject}" is not in the allowed list`);
    }
    if (!VALID_DIFFICULTIES.has(course.difficulty as string)) {
      err('$.course.difficulty', `difficulty "${course.difficulty}" must be beginner | intermediate | advanced`);
    }
    if (!VALID_ANIMATION_STYLES.has(course.animation_style as string)) {
      err('$.course.animation_style', `animation_style "${course.animation_style}" must be cartoon | minimal | realistic`);
    }
    if (!VALID_LANGUAGES.has(course.language as string)) {
      err('$.course.language', `language "${course.language}" must be zh | en`);
    }
    if (typeof course.estimated_total_minutes !== 'number' || course.estimated_total_minutes <= 0) {
      err('$.course.estimated_total_minutes', 'estimated_total_minutes must be a positive number');
    }
    if (!Array.isArray(course.tags) || course.tags.length === 0) {
      err('$.course.tags', 'tags must be a non-empty array');
    }
  }

  // ── lessons ──
  const lessons = plan.lessons;
  if (!Array.isArray(lessons) || lessons.length === 0) {
    err('$.lessons', 'lessons must be a non-empty array');
    return { valid: errors.length === 0, errors, summary: buildSummary(errors) };
  }

  if (lessons.length < 3 || lessons.length > 8) {
    err('$.lessons', `lessons count must be 3-8, got ${lessons.length}`);
  }

  (lessons as unknown[]).forEach((item, i) => {
    const lesson = item as Record<string, unknown>;
    const p = `$.lessons[${i}]`;

    if (!isStr(lesson.title))     err(`${p}.title`,     'title is required');
    if (!isStr(lesson.objective)) err(`${p}.objective`, 'objective is required');

    if (!Array.isArray(lesson.key_points) || lesson.key_points.length < 3 || lesson.key_points.length > 6) {
      err(`${p}.key_points`, `key_points must be an array of 3-6 strings, got ${Array.isArray(lesson.key_points) ? lesson.key_points.length : typeof lesson.key_points}`);
    }

    if (!VALID_LESSON_TYPES.has(lesson.type as string)) {
      err(`${p}.type`, `type "${lesson.type}" must be interactive | quiz | video | article`);
    }

    const order = lesson.order;
    if (typeof order !== 'number' || !Number.isInteger(order) || order !== i + 1) {
      err(`${p}.order`, `order must be ${i + 1}, got ${order}`);
    }

    const mins = lesson.estimated_minutes;
    if (typeof mins !== 'number' || mins < 10 || mins > 30) {
      err(`${p}.estimated_minutes`, `estimated_minutes must be 10-30, got ${mins}`);
    }

    const xp = lesson.xp_reward;
    if (typeof xp !== 'number' || xp < 30 || xp > 100) {
      err(`${p}.xp_reward`, `xp_reward must be 30-100, got ${xp}`);
    }
  });

  return { valid: errors.length === 0, errors, summary: buildSummary(errors) };
}

function buildSummary(errors: PlanValidationError[]): string {
  if (errors.length === 0) return 'Plan JSON valid.';
  const details = errors.slice(0, 3).map((e) => `[${e.path}] ${e.message}`).join('; ');
  const more = errors.length > 3 ? ` (+${errors.length - 3} more)` : '';
  return `Plan validation failed — ${errors.length} error${errors.length > 1 ? 's' : ''}: ${details}${more}`;
}

// ────────────────────────────────────────────────────────────────────
// Request handler
// ────────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ success: false, error: 'Server configuration error: GEMINI_API_KEY not set' }, 500);
  }

  let description: string;
  let difficulty: string;
  let animationStyle: string;
  let language: string;
  try {
    const body = await req.json();
    description  = String(body.description  ?? '').trim();
    difficulty   = String(body.difficulty   ?? 'beginner');
    animationStyle = String(body.animationStyle ?? 'minimal');
    language     = String(body.language     ?? 'zh');
  } catch (_) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (!description) {
    return jsonResponse({ success: false, error: 'description is required' }, 400);
  }

  // Normalise to allowed values (fall back to defaults if caller sends garbage)
  if (!VALID_DIFFICULTIES.has(difficulty))       difficulty    = 'beginner';
  if (!VALID_ANIMATION_STYLES.has(animationStyle)) animationStyle = 'minimal';
  if (!VALID_LANGUAGES.has(language))            language      = 'zh';

  const prompt = buildPlanPrompt(description, difficulty, animationStyle, language);

  let lastError = 'No model succeeded';
  let lastValidationErrors: PlanValidationError[] | undefined;

  for (const model of MODEL_CANDIDATES) {
    const result = await callGemini(model, prompt, apiKey);

    if (!result.success || !result.content) {
      lastError = result.error ?? lastError;
      if (!shouldTryNextModel(result)) break;
      continue;
    }

    const parsed = parseJsonObject(result.content);
    if (!parsed) {
      const snippet = result.content.slice(0, 200).replace(/\n/g, ' ');
      lastError = `Could not parse JSON from model ${model} (first 200 chars: "${snippet}")`;
      continue;
    }

    const validation = validatePlanJson(parsed);
    if (!validation.valid) {
      lastError = validation.summary;
      lastValidationErrors = validation.errors;
      continue;
    }

    return jsonResponse({ success: true, planJson: parsed as unknown as CoursePlanJson, model });
  }

  const fail: Record<string, unknown> = { success: false, error: lastError };
  if (lastValidationErrors) fail.validationErrors = lastValidationErrors;
  return jsonResponse(fail, 500);
});
