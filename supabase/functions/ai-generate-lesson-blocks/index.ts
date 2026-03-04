/**
 * POST /functions/v1/ai-generate-lesson-blocks
 *
 * Generates content blocks for ONE lesson.
 * Called once per lesson by the Phase 2D orchestrator (agentic-generate-course).
 *
 * Request body:
 *   {
 *     lessonPlan: CoursePlanLesson,   // order, title, objective, key_points, type, …
 *     courseContext: {
 *       title:          string,       // parent course title
 *       subject:        string,
 *       difficulty:     string,
 *       target_audience: string,
 *       animation_style: string,
 *       language:       string,       // zh | en — all generated text must use this language
 *     }
 *   }
 *
 * Response (success):
 *   { success: true, page: LessonJson, model: string }
 *   where LessonJson = { lessonTitle: string, blocks: LessonBlock[] }
 *
 * Response (error):
 *   { success: false, error: string, validationErrors?: BlockValidationError[] }
 *
 * Block IDs are prefixed with "l{order}-" (e.g. "l1-b0") to guarantee
 * global uniqueness when Phase 2D merges lessons from multiple calls.
 */

import type { CoursePlanLesson, LessonJson } from '../_shared/types/course_plan.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_BASE_URL  = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_OUTPUT_TOKENS = 16384;

const MODEL_CANDIDATES = [
  'gemini-2.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro-latest',
  'gemini-2.5-pro',
];

const VALID_BLOCK_TYPES = new Set([
  'text', 'image', 'code-block', 'code-playground',
  'multiple-choice', 'fill-blank', 'true-false', 'matching', 'video',
]);

const INTERACTIVE_BLOCK_TYPES = new Set([
  'code-playground', 'multiple-choice', 'fill-blank', 'true-false', 'matching',
]);

// ────────────────────────────────────────────────────────────────────
// Prompt
// ────────────────────────────────────────────────────────────────────

const BLOCK_TYPE_REFERENCE = `Allowed block types and exact JSON format:

1) text
{"type":"text","id":"b0","position":{"order":0},"style":{"spacing":"md","alignment":"left"},"content":{"format":"markdown","value":"## Heading\\n\\nParagraph text."}}

2) image
{"type":"image","id":"b1","position":{"order":1},"style":{"spacing":"md","alignment":"center"},"content":{"url":"https://example.com/img.png","alt":"Alt text","caption":"Caption"}}

3) code-block  (read-only display)
{"type":"code-block","id":"b2","position":{"order":2},"style":{"spacing":"md","alignment":"left"},"content":{"language":"python","code":"x = 1\\nprint(x)"}}

4) code-playground  (editable + runnable)
{"type":"code-playground","id":"b3","position":{"order":3},"style":{"spacing":"md","alignment":"left"},"content":{"language":"python","initialCode":"# fill in the blank\\nresult = ___\\nprint(result)","expectedOutput":"2","hints":["Use the + operator"],"runnable":true}}

5) multiple-choice
{"type":"multiple-choice","id":"b4","position":{"order":4},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Question text?","options":[{"id":"a","text":"Option A"},{"id":"b","text":"Option B"},{"id":"c","text":"Option C"}],"correctAnswer":"a","correctAnswers":["a"],"multiSelect":false,"explanation":"Explanation."}}

6) fill-blank
{"type":"fill-blank","id":"b5","position":{"order":5},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Python uses ___ to print output.","correctAnswer":"print","hint":"It is a built-in function"}}

7) true-false
{"type":"true-false","id":"b6","position":{"order":6},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Python is a compiled language.","correctAnswer":false,"explanation":"Python is interpreted."}}

8) matching
{"type":"matching","id":"b7","position":{"order":7},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Match each term to its meaning.","leftItems":[{"id":"l1","text":"variable"},{"id":"l2","text":"function"}],"rightItems":[{"id":"r1","text":"stores a value"},{"id":"r2","text":"reusable block of code"}],"correctPairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"}],"explanation":"Explanation."}}

9) video
{"type":"video","id":"b8","position":{"order":8},"style":{"spacing":"md","alignment":"center"},"content":{"url":"https://example.com/video.mp4","title":"Video title"}}`;

function buildLessonPrompt(
  lesson: CoursePlanLesson,
  courseContext: CourseContext,
  qualityHints?: string[],
): string {
  const keyPointsList = lesson.key_points.map((kp, i) => `  ${i + 1}. ${kp}`).join('\n');

  const animationHint =
    courseContext.animation_style === 'cartoon'
      ? 'Prefer visual, animated, and playful examples. Use animation blocks where they help.'
      : courseContext.animation_style === 'realistic'
      ? 'Use realistic, professional examples. Include video or image blocks when they add clarity.'
      : 'Keep content clean and minimal. Prefer text, code, and quiz blocks over decorative elements.';

  const subjectHint = getSubjectHint(courseContext.subject, lesson.type);

  return `You are an expert instructional designer for Primoria, an interactive STEM learning platform.
Generate content blocks for ONE lesson. Return JSON only — no markdown, no code fences, no explanations.

Output structure (exact — do NOT add or remove top-level keys):
{
  "lessonTitle": "<lesson title>",
  "blocks": [ /* array of block objects */ ]
}

═══ COURSE CONTEXT ═══
Course title:    ${courseContext.title}
Subject:         ${courseContext.subject}
Difficulty:      ${courseContext.difficulty}
Target audience: ${courseContext.target_audience}
Animation style: ${courseContext.animation_style} — ${animationHint}
Language:        ${courseContext.language} ← write ALL content (titles, text, questions, hints, explanations) in this language

═══ THIS LESSON ═══
Title:     ${lesson.title}
Objective: ${lesson.objective}
Key concepts to cover:
${keyPointsList}

═══ HARD CONSTRAINTS ═══
- Generate 4-15 blocks. Do NOT exceed 15.
- Must include at least 2 interactive blocks (code-playground, multiple-choice, fill-blank, true-false, or matching).
- Rhythm: introduce concept → show example → practice (at least one interactive block after every 1-2 concept blocks).
- All block IDs must be unique (use simple names like b0, b1, b2 … — they will be prefixed automatically).
- position.order is 0-based and continuous within this lesson.
- Write ALL text, question, answer, hint, and explanation content in the specified language.
- Keep text blocks concise: ≤ 3 sentences each.
- If no real image/video URL is available, use text or quiz blocks instead of fake URLs.
${subjectHint}
${qualityHints && qualityHints.length > 0
  ? `\n═══ QUALITY GUIDANCE ═══\n${qualityHints.map((h) => `- ${h}`).join('\n')}\n`
  : ''}
${BLOCK_TYPE_REFERENCE}`;
}

function getSubjectHint(subject: string, lessonType: string): string {
  if (lessonType === 'quiz') {
    return '- This is a quiz lesson: use mostly multiple-choice, fill-blank, true-false, and matching blocks. Minimal or no text blocks.';
  }
  switch (subject) {
    case 'Computer Science':
    case 'Engineering':
    case 'Data Science & AI':
      return '- Include at least 1 code-block (display) and 1 code-playground (practice) if the key concepts involve code.';
    case 'Mathematics':
    case 'Physics':
      return '- Use text for worked examples, fill-blank for formula checks, and true-false for conceptual verification.';
    default:
      return '- Prefer text + multiple-choice + fill-blank. Add matching for terminology lessons.';
  }
}

// ────────────────────────────────────────────────────────────────────
// Gemini helpers
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
      temperature: 0.3,
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
      const j = JSON.parse(errorText);
      errorMessage = j?.error?.message ?? errorMessage;
    } catch (_) {
      if (errorText) errorMessage = errorText;
    }
    return { success: false, error: `Model ${model} returned ${response.status}: ${errorMessage}`, statusCode: response.status };
  }

  let data: Record<string, unknown>;
  try { data = await response.json(); }
  catch (e) { return { success: false, error: `Failed to parse Gemini response: ${e}` }; }

  const candidates  = (data?.candidates as unknown[]) ?? [];
  const first       = candidates[0] as Record<string, unknown> | undefined;
  const finishReason = first?.finishReason as string | undefined;
  const parts        = ((first?.content as Record<string, unknown>)?.parts as unknown[]) ?? [];
  const text         = (parts[0] as Record<string, unknown>)?.text as string | undefined;

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
  const raw = text.trim();

  // 1. Try raw parse first — preserves all Unicode characters inside strings
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
  } catch (_) {}

  // 2. Try markdown code-block extraction on raw text
  const block = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (block) {
    try {
      const p = JSON.parse(block[1].trim());
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch (_) {}
  }

  // 3. Extract {…} boundaries from raw text
  const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      const p = JSON.parse(raw.slice(first, last + 1));
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch (_) {}
  }

  // 4. Fallback: apply Unicode normalisation (for models that use fullwidth
  //    punctuation as JSON separators) then retry all three strategies.
  //    Note: \u201C/\u201D replacement is intentionally omitted here because
  //    Chinese curly-quotes inside string values would corrupt valid JSON.
  const s = raw
    .replace(/\uFF0C/g, ',')
    .replace(/\uFF1A/g, ':');

  try {
    const p = JSON.parse(s);
    if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
  } catch (_) {}

  const block2 = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (block2) {
    try {
      const p = JSON.parse(block2[1].trim());
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch (_) {}
  }

  const first2 = s.indexOf('{'), last2 = s.lastIndexOf('}');
  if (first2 !== -1 && last2 > first2) {
    try {
      const p = JSON.parse(s.slice(first2, last2 + 1));
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch (_) {}
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────
// Block ID prefixing
// ────────────────────────────────────────────────────────────────────

/**
 * Prefix every block.id and any intra-block id references with "l{order}-"
 * to guarantee global uniqueness when Phase 2D merges pages from all lessons.
 */
function prefixBlockIds(
  blocks: Record<string, unknown>[],
  lessonOrder: number,
): Record<string, unknown>[] {
  const prefix = `l${lessonOrder}-`;
  return blocks.map((block) => {
    const b: Record<string, unknown> = { ...block, id: `${prefix}${block.id ?? 'b'}` };

    // matching block: prefix leftItems, rightItems, and correctPairs ids
    if (b.type === 'matching') {
      const content = { ...(b.content as Record<string, unknown>) };
      if (Array.isArray(content.leftItems)) {
        content.leftItems = (content.leftItems as Record<string, unknown>[]).map(
          (item) => ({ ...item, id: `${prefix}${item.id}` }),
        );
      }
      if (Array.isArray(content.rightItems)) {
        content.rightItems = (content.rightItems as Record<string, unknown>[]).map(
          (item) => ({ ...item, id: `${prefix}${item.id}` }),
        );
      }
      if (Array.isArray(content.correctPairs)) {
        content.correctPairs = (content.correctPairs as Record<string, unknown>[]).map(
          (pair) => ({
            ...pair,
            leftId:  `${prefix}${pair.leftId}`,
            rightId: `${prefix}${pair.rightId}`,
          }),
        );
      }
      b.content = content;
    }

    // multiple-choice: prefix option ids and correctAnswer(s)
    if (b.type === 'multiple-choice') {
      const content = { ...(b.content as Record<string, unknown>) };
      if (Array.isArray(content.options)) {
        content.options = (content.options as Record<string, unknown>[]).map(
          (opt) => ({ ...opt, id: `${prefix}${opt.id}` }),
        );
      }
      if (typeof content.correctAnswer === 'string') {
        content.correctAnswer = `${prefix}${content.correctAnswer}`;
      }
      if (Array.isArray(content.correctAnswers)) {
        content.correctAnswers = (content.correctAnswers as string[]).map(
          (id) => `${prefix}${id}`,
        );
      }
      b.content = content;
    }

    return b;
  });
}

// ────────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────────

interface BlockValidationError {
  path: string;
  message: string;
}

interface BlockValidationResult {
  valid: boolean;
  errors: BlockValidationError[];
  summary: string;
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && (v as string).trim().length > 0;
}

function validateLessonPage(json: unknown): BlockValidationResult {
  const errors: BlockValidationError[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });

  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    err('$', 'Response must be a JSON object');
    return { valid: false, errors, summary: buildSummary(errors) };
  }

  const page = json as Record<string, unknown>;

  if (!isStr(page.lessonTitle)) {
    err('$.lessonTitle', 'lessonTitle is required and must be a non-empty string');
  }

  const blocks = page.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    err('$.blocks', 'blocks must be a non-empty array');
    return { valid: false, errors, summary: buildSummary(errors) };
  }

  if (blocks.length < 4 || blocks.length > 15) {
    err('$.blocks', `blocks count must be 4-15, got ${blocks.length}`);
  }

  const seenIds = new Set<string>();
  let interactiveCount = 0;

  (blocks as unknown[]).forEach((item, i) => {
    const b = item as Record<string, unknown>;
    const p = `$.blocks[${i}]`;

    const id = b.id as string | undefined;
    if (!isStr(id)) {
      err(`${p}.id`, 'block.id is required');
    } else if (seenIds.has(id)) {
      err(`${p}.id`, `duplicate block id "${id}"`);
    } else {
      seenIds.add(id);
    }

    const type = b.type as string | undefined;
    if (!isStr(type) || !VALID_BLOCK_TYPES.has(type)) {
      err(`${p}.type`, `block.type "${type}" is not a valid block type`);
      return;
    }

    if (INTERACTIVE_BLOCK_TYPES.has(type)) interactiveCount++;

    if (!b.content || typeof b.content !== 'object' || Array.isArray(b.content)) {
      err(`${p}.content`, 'block.content must be an object');
    }
  });

  if (interactiveCount < 2) {
    err('$.blocks', `at least 2 interactive blocks required, found ${interactiveCount}`);
  }

  return { valid: errors.length === 0, errors, summary: buildSummary(errors) };
}

function buildSummary(errors: BlockValidationError[]): string {
  if (errors.length === 0) return 'Page valid.';
  const details = errors.slice(0, 3).map((e) => `[${e.path}] ${e.message}`).join('; ');
  const more = errors.length > 3 ? ` (+${errors.length - 3} more)` : '';
  return `Block validation failed — ${errors.length} error${errors.length > 1 ? 's' : ''}: ${details}${more}`;
}

const MAX_RETRIES_PER_MODEL = 2;

/**
 * Append the validation errors to the original prompt so the model can
 * self-correct. Only used on retry attempts within the same model.
 */
function buildCorrectionPrompt(
  originalPrompt: string,
  errors: BlockValidationError[],
): string {
  const errorList = errors.map((e) => `  - [${e.path}] ${e.message}`).join('\n');
  return `${originalPrompt}

═══ CORRECTION REQUIRED ═══
Your previous response failed validation. Fix ALL of the following errors and return the complete corrected JSON:
${errorList}
Return ONLY the corrected JSON object — no explanations, no markdown fences.`;
}

// ────────────────────────────────────────────────────────────────────
// Request types
// ────────────────────────────────────────────────────────────────────

interface CourseContext {
  title:           string;
  subject:         string;
  difficulty:      string;
  target_audience: string;
  animation_style: string;
  language:        string;
}

// ────────────────────────────────────────────────────────────────────
// Response helper
// ────────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ────────────────────────────────────────────────────────────────────
// Request handler
// ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ success: false, error: 'Server configuration error: GEMINI_API_KEY not set' }, 500);
  }

  let lessonPlan: CoursePlanLesson;
  let courseContext: CourseContext;
  let qualityHints: string[] | undefined;
  try {
    const body = await req.json();
    lessonPlan    = body.lessonPlan    as CoursePlanLesson;
    courseContext  = body.courseContext as CourseContext;
    qualityHints  = Array.isArray(body.qualityHints) ? body.qualityHints as string[] : undefined;

    if (!lessonPlan || !courseContext) throw new Error('missing fields');
    if (!lessonPlan.title || !Array.isArray(lessonPlan.key_points)) throw new Error('invalid lessonPlan');
    if (!courseContext.title || !courseContext.language) throw new Error('invalid courseContext');
  } catch (e) {
    return jsonResponse({ success: false, error: `Invalid request body: ${e}` }, 400);
  }

  const basePrompt = buildLessonPrompt(lessonPlan, courseContext, qualityHints);

  let lastError = 'No model succeeded';
  let lastValidationErrors: BlockValidationError[] | undefined;
  let fatalError = false;

  for (const model of MODEL_CANDIDATES) {
    if (fatalError) break;

    let currentPrompt = basePrompt;

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      const result = await callGemini(model, currentPrompt, apiKey);

      if (!result.success || !result.content) {
        lastError = result.error ?? lastError;
        if (!shouldTryNextModel(result)) fatalError = true;
        break; // next model (or stop if fatalError)
      }

      const parsed = parseJsonObject(result.content);
      if (!parsed) {
        const snippet = result.content.slice(0, 200).replace(/\n/g, ' ');
        lastError = `Could not parse JSON from model ${model} attempt ${attempt + 1} (first 200 chars: "${snippet}")`;
        break; // parse errors unlikely to improve with correction prompt — try next model
      }

      const validation = validateLessonPage(parsed);
      if (!validation.valid) {
        lastError = validation.summary;
        lastValidationErrors = validation.errors;

        if (attempt < MAX_RETRIES_PER_MODEL) {
          // Inject errors into prompt and retry same model
          currentPrompt = buildCorrectionPrompt(basePrompt, validation.errors);
          continue;
        }
        break; // exhausted retries for this model, try next
      }

      // Prefix block IDs for global uniqueness across lessons
      const prefixed: Record<string, unknown> = {
        ...parsed,
        blocks: prefixBlockIds(
          (parsed.blocks as Record<string, unknown>[]),
          lessonPlan.order,
        ),
      };

      return jsonResponse({ success: true, page: prefixed as unknown as LessonJson, model });
    }
  }

  const fail: Record<string, unknown> = { success: false, error: lastError };
  if (lastValidationErrors) fail.validationErrors = lastValidationErrors;
  return jsonResponse(fail, 500);
});
