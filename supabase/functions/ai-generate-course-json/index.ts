/**
 * POST /functions/v1/ai-generate-course-json
 *
 * Request body:
 *   Text mode:
 *     { description: string, difficulty?: string, animationStyle?: string, audience?: string }
 *   PDF mode:
 *     { pdfBase64?: string, storageUrl?: string, fileName?: string }
 *
 * Response (success):
 *   { success: true, courseJson: object, model: string }
 *
 * Response (error):
 *   { success: false, error: string }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_OUTPUT_TOKENS = 32768;
const PDF_MIME_TYPE = 'application/pdf';

// Try models from fastest/cheapest to most capable
const MODEL_CANDIDATES = [
  'gemini-2.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro-latest',
  'gemini-2.5-pro',
];

// ────────────────────────────────────────────────────────────────────
// Prompt — defines all allowed block types and generation constraints
// Moved here from Builder client (ai_course_generator.dart) so that
// prompt changes only require a function redeploy, not a Flutter build.
// ────────────────────────────────────────────────────────────────────
const COURSE_GENERATION_PROMPT = `You are an expert instructional designer. Create a Primoria course JSON based on the course description provided by the user.

Return JSON only. Do not output markdown/code fences/explanations.
All strings must use double quotes.

JSON schema (example with 2 lessons — your output must follow this structure):
{
  "courseId": "course-xxx",
  "metadata": {
    "title": "Course title",
    "description": "Short description",
    "author": {"userId": "ai", "displayName": "AI"},
    "tags": ["tag"],
    "difficulty": "beginner",
    "estimatedMinutes": 30
  },
  "pages": [
    {
      "pageId": "p1",
      "title": "Introduction to Variables",
      "blocks": [/* 6-9 blocks */]
    },
    {
      "pageId": "p2",
      "title": "Working with Data Types",
      "blocks": [/* 6-9 blocks */]
    }
  ]
}

Hard constraints:
- Generate 2-4 lessons (pages). Use 2 for short/focused topics, 3-4 for rich or broad ones.
- Every lesson covers one coherent learning objective or sub-topic.
- Each lesson must have 6-9 blocks. Do NOT exceed 9 blocks per lesson.
- Total blocks across all lessons must not exceed 30.
- position.order is 0-based and continuous within each lesson independently.
- Every id (pageId, block id, option id) must be globally unique across the whole course.
- Use \\n for newlines in text. Keep text blocks concise (≤ 3 sentences each).
- Keep metadata concise and useful.
- Keep an explain-practice rhythm inside each lesson: 1 assessment block after every 1-2 concept blocks.

Allowed block types and exact type values:

1) text
{"type":"text","id":"b1","position":{"order":0},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"format":"markdown","value":"Text"}}

2) image
{"type":"image","id":"b2","position":{"order":1},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"url":"https://...","alt":"Alt text","caption":"Caption"}}

3) code-block
{"type":"code-block","id":"b3","position":{"order":2},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"language":"python","code":"print(1)"}}

4) code-playground
{"type":"code-playground","id":"b4","position":{"order":3},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"language":"python","initialCode":"print(1)","expectedOutput":"1","hints":["hint"],"runnable":true}}

5) multiple-choice
{"type":"multiple-choice","id":"b5","position":{"order":4},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Question","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}],"correctAnswer":"a","correctAnswers":["a"],"multiSelect":false,"explanation":"Explanation"}}

6) fill-blank
{"type":"fill-blank","id":"b6","position":{"order":5},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"The CPU stands for ____.","correctAnswer":"Central Processing Unit","hint":"Expand CPU"}}

7) true-false
{"type":"true-false","id":"b7","position":{"order":6},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Statement","correctAnswer":true,"explanation":"Why"}}

8) matching
{"type":"matching","id":"b8","position":{"order":7},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Match terms","leftItems":[{"id":"l1","text":"A"},{"id":"l2","text":"B"}],"rightItems":[{"id":"r1","text":"1"},{"id":"r2","text":"2"}],"correctPairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"}],"explanation":"Why"}}

9) video
{"type":"video","id":"b9","position":{"order":8},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"url":"https://...","title":"Video title"}}

10) animation
{"type":"animation","id":"b10","position":{"order":9},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"preset":"bouncing-dot","durationMs":2000,"loop":true,"speed":1.0}}

Course-adaptive block strategy:
- Programming / CS: include code-block + code-playground + conceptual quizzes (multiple-choice / fill-blank / matching / true-false).
- Math / Physics / Engineering: prioritize worked explanations (text), formula understanding checks (fill-blank, true-false), concept mapping (matching), and simple animation when it helps.
- Language / History / Business / Humanities: prioritize text + multiple-choice + fill-blank + matching; add image/video only when it improves understanding.
- Use at least 4 different block types when the source material supports it.
- If real image/video URLs are unavailable, use text or quiz blocks instead of fake URLs.`;

function buildPrompt(
  description: string,
  difficulty: string,
  animationStyle: string,
  audience: string,
): string {
  return `${COURSE_GENERATION_PROMPT}

User course request:
"${description.trim()}"

Additional requirements:
- Difficulty level: ${difficulty}
- Animation style preference: ${animationStyle}
- Target audience: ${audience}
- Generate content entirely from the description above.
- Follow all hard constraints and block type rules above.`;
}

function buildPdfPrompt(fileName: string): string {
  const safeFileName = fileName.trim() || 'uploaded.pdf';
  return `${COURSE_GENERATION_PROMPT}

Input source:
- An uploaded PDF document
- File name (metadata hint only): ${safeFileName}

Additional requirements:
- Generate content entirely from the uploaded PDF above.
- Follow all hard constraints and block type rules above.`;
}

// ────────────────────────────────────────────────────────────────────
// Gemini API helpers
// ────────────────────────────────────────────────────────────────────

interface GeminiResult {
  success: boolean;
  content?: string;
  error?: string;
  statusCode?: number;
}

async function callGeminiModel(
  model: string,
  prompt: string,
  apiKey: string,
): Promise<GeminiResult> {
  return callGeminiModelWithParts(
    model,
    [{ text: prompt }],
    apiKey,
    0.0,
  );
}

async function callGeminiModelWithParts(
  model: string,
  requestParts: unknown[],
  apiKey: string,
  temperature: number,
): Promise<GeminiResult> {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: requestParts }],
    generationConfig: {
      temperature,
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
  const firstCandidate = candidates[0] as Record<string, unknown> | undefined;
  const finishReason = firstCandidate?.finishReason as string | undefined;
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = (content?.parts as unknown[]) ?? [];
  const firstPart = parts[0] as Record<string, unknown> | undefined;
  const text = firstPart?.text as string | undefined;

  // MAX_TOKENS → output was cut off mid-JSON; try next model (higher token limit)
  if (finishReason === 'MAX_TOKENS') {
    return {
      success: false,
      error: `Model ${model} output truncated (MAX_TOKENS) — try a model with larger output limit`,
    };
  }

  // SAFETY / RECITATION / etc. → model refused; try next model
  if (finishReason && finishReason !== 'STOP' && !text?.trim()) {
    return {
      success: false,
      error: `Model ${model} did not complete (finishReason=${finishReason})`,
    };
  }

  if (!text?.trim()) {
    return { success: false, error: `Model ${model} returned empty content` };
  }

  // Truncation guard: valid JSON must end with '}'.
  // If MAX_TOKENS wasn't flagged but the text is cut off, catch it here.
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith('}')) {
    const tail = trimmed.slice(-60).replace(/\n/g, ' ');
    return {
      success: false,
      error: `Model ${model} output truncated mid-JSON (last 60 chars: "...${tail}")`,
    };
  }

  return { success: true, content: text };
}

function normalizeBase64(input: string): string {
  const value = input.trim();
  if (!value) return '';
  if (value.startsWith('data:')) {
    const commaIndex = value.indexOf(',');
    if (commaIndex >= 0 && commaIndex < value.length - 1) {
      return value.slice(commaIndex + 1).trim();
    }
  }
  return value;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function loadPdfBase64FromStorageUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch storageUrl (${response.status})`);
  }

  const pdfBytes = new Uint8Array(await response.arrayBuffer());
  if (pdfBytes.length === 0) {
    throw new Error('Downloaded PDF is empty');
  }
  return bytesToBase64(pdfBytes);
}

function shouldTryNextModel(result: GeminiResult): boolean {
  const code = result.statusCode;
  if (code === 404 || code === 429) return true;
  if (code === 500 || code === 502 || code === 503 || code === 504) {
    return true;
  }

  const msg = (result.error ?? '').toLowerCase();
  if (
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource exhausted') ||
    msg.includes('unavailable')
  ) {
    return true;
  }

  // No HTTP status code = content-level failure (empty response, network error)
  // Always try next model — another model may succeed.
  if (code === undefined) return true;

  if (code !== 400 && code !== 403) return false;
  return (
    (msg.includes('model') &&
      (msg.includes('not found') ||
        msg.includes('unsupported') ||
        msg.includes('not available') ||
        msg.includes('not enabled'))) ||
    (msg.includes('permission') && msg.includes('model'))
  );
}

// ────────────────────────────────────────────────────────────────────
// JSON parsing helper (mirrors Flutter client logic)
// ────────────────────────────────────────────────────────────────────

function parseJsonObject(text: string): Record<string, unknown> | null {
  const sanitized = text
    .trim()
    .replace(/\uFF0C/g, ',')
    .replace(/\uFF1A/g, ':')
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2018|\u2019/g, "'");

  // 1. Direct parse
  try {
    const parsed = JSON.parse(sanitized);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (_) {}

  // 2. JSON code block
  const codeBlock = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlock) {
    try {
      const parsed = JSON.parse(codeBlock[1].trim());
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (_) {}
  }

  // 3. Extract { ... } from surrounding text
  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(sanitized.slice(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (_) {}
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────
// Schema validation (server-side mirror of Flutter CourseSchemaValidator)
// ────────────────────────────────────────────────────────────────────

interface SchemaError {
  path: string;
  code: string;
  message: string;
}

interface SchemaWarning {
  path: string;
  message: string;
}

interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaError[];
  warnings: SchemaWarning[];
  summary: string;
}

const VALID_BLOCK_TYPES = new Set([
  'text', 'image', 'code-block', 'code-playground',
  'multiple-choice', 'fill-blank', 'true-false', 'matching', 'video', 'animation',
]);

const VALID_DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);
const VALID_ANIMATION_PRESETS = new Set(['bouncing-dot', 'pulse-bars']);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNonNegativeInt(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function validateBlockContent(
  block: Record<string, unknown>,
  blockPath: string,
  errors: SchemaError[],
  warnings: SchemaWarning[],
): void {
  const content = block.content as Record<string, unknown> | undefined;
  const type = block.type as string;
  const cp = `${blockPath}.content`;

  switch (type) {
    case 'text':
      if (!isNonEmptyString(content?.value)) {
        errors.push({ path: `${cp}.value`, code: 'REQUIRED', message: 'text block content.value is required' });
      }
      break;

    case 'image':
      if (!isNonEmptyString(content?.url)) {
        errors.push({ path: `${cp}.url`, code: 'REQUIRED', message: 'image block content.url is required and must be non-empty' });
      }
      break;

    case 'code-block':
      if (content?.code === undefined || content?.code === null) {
        errors.push({ path: `${cp}.code`, code: 'REQUIRED', message: 'code-block content.code is required' });
      }
      break;

    case 'code-playground':
      if (content?.initialCode === undefined || content?.initialCode === null) {
        errors.push({ path: `${cp}.initialCode`, code: 'REQUIRED', message: 'code-playground content.initialCode is required' });
      }
      break;

    case 'multiple-choice': {
      if (!isNonEmptyString(content?.question)) {
        errors.push({ path: `${cp}.question`, code: 'REQUIRED', message: 'multiple-choice content.question is required' });
      }
      const options = content?.options;
      if (!Array.isArray(options) || options.length < 2) {
        errors.push({ path: `${cp}.options`, code: 'INVALID_VALUE', message: 'multiple-choice content.options must have at least 2 items' });
      } else {
        (options as unknown[]).forEach((opt, k) => {
          const o = opt as Record<string, unknown>;
          if (!isNonEmptyString(o?.id) || !isNonEmptyString(o?.text)) {
            errors.push({ path: `${cp}.options[${k}]`, code: 'REQUIRED', message: `option at index ${k} must have non-empty id and text` });
          }
        });
      }
      if (content?.correctAnswer === undefined && content?.correctAnswers === undefined) {
        errors.push({ path: `${cp}.correctAnswer`, code: 'REQUIRED', message: 'multiple-choice must have correctAnswer or correctAnswers' });
      }
      break;
    }

    case 'fill-blank':
      if (!isNonEmptyString(content?.question)) {
        errors.push({ path: `${cp}.question`, code: 'REQUIRED', message: 'fill-blank content.question is required' });
      }
      if (!isNonEmptyString(content?.correctAnswer)) {
        errors.push({ path: `${cp}.correctAnswer`, code: 'REQUIRED', message: 'fill-blank content.correctAnswer is required' });
      }
      break;

    case 'true-false':
      if (typeof content?.correctAnswer !== 'boolean') {
        errors.push({
          path: `${cp}.correctAnswer`,
          code: 'INVALID_TYPE',
          message: `correctAnswer must be boolean for true-false blocks, got ${typeof content?.correctAnswer}`,
        });
      }
      break;

    case 'matching': {
      const left = content?.leftItems;
      const right = content?.rightItems;
      if (!Array.isArray(left) || left.length < 2) {
        errors.push({ path: `${cp}.leftItems`, code: 'INVALID_VALUE', message: 'matching leftItems must have at least 2 items' });
      }
      if (!Array.isArray(right) || right.length < 2) {
        errors.push({ path: `${cp}.rightItems`, code: 'INVALID_VALUE', message: 'matching rightItems must have at least 2 items' });
      }
      const pairs = content?.correctPairs;
      if (!Array.isArray(pairs) || pairs.length === 0) {
        errors.push({ path: `${cp}.correctPairs`, code: 'REQUIRED', message: 'matching correctPairs must be a non-empty array' });
      } else if (Array.isArray(left) && Array.isArray(right)) {
        const leftIds = new Set((left as Record<string, unknown>[]).map((x) => x.id));
        const rightIds = new Set((right as Record<string, unknown>[]).map((x) => x.id));
        for (const pair of pairs as Record<string, unknown>[]) {
          if (!leftIds.has(pair.leftId) || !rightIds.has(pair.rightId)) {
            errors.push({ path: `${cp}.correctPairs`, code: 'INVALID_PAIRS', message: 'correctPairs reference IDs not present in leftItems/rightItems' });
            break;
          }
        }
      }
      break;
    }

    case 'animation': {
      const preset = content?.preset;
      if (!VALID_ANIMATION_PRESETS.has(preset as string)) {
        warnings.push({ path: `${cp}.preset`, message: `animation preset "${preset}" is not a known value (expected bouncing-dot or pulse-bars)` });
      }
      const durationMs = content?.durationMs;
      if (typeof durationMs === 'number' && (durationMs < 300 || durationMs > 10000)) {
        warnings.push({ path: `${cp}.durationMs`, message: `animation durationMs ${durationMs} is outside recommended range 300-10000` });
      }
      const speed = content?.speed;
      if (typeof speed === 'number' && (speed < 0.25 || speed > 3.0)) {
        warnings.push({ path: `${cp}.speed`, message: `animation speed ${speed} is outside recommended range 0.25-3.0` });
      }
      break;
    }

    case 'video':
      if (!isNonEmptyString(content?.url)) {
        errors.push({ path: `${cp}.url`, code: 'REQUIRED', message: 'video block content.url is required and must be non-empty' });
      }
      break;
  }
}

function validateCourseSchema(json: unknown): SchemaValidationResult {
  const errors: SchemaError[] = [];
  const warnings: SchemaWarning[] = [];

  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    errors.push({ path: '$', code: 'INVALID_TYPE', message: 'Course JSON must be an object' });
    return { valid: false, errors, warnings, summary: buildValidationSummary(errors, warnings) };
  }

  const course = json as Record<string, unknown>;

  // courseId
  if (!isNonEmptyString(course.courseId)) {
    errors.push({ path: '$.courseId', code: 'REQUIRED', message: 'courseId is required and must be a non-empty string' });
  }

  // metadata
  const meta = course.metadata as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== 'object') {
    errors.push({ path: '$.metadata', code: 'REQUIRED', message: 'metadata object is required' });
  } else {
    if (!isNonEmptyString(meta.title)) {
      errors.push({ path: '$.metadata.title', code: 'REQUIRED', message: 'metadata.title is required and must be a non-empty string' });
    }
    if (meta.difficulty !== undefined && !VALID_DIFFICULTIES.has(meta.difficulty as string)) {
      warnings.push({ path: '$.metadata.difficulty', message: `metadata.difficulty "${meta.difficulty}" should be beginner, intermediate, or advanced` });
    }
    if (meta.estimatedMinutes !== undefined && !isNonNegativeInt(meta.estimatedMinutes)) {
      warnings.push({ path: '$.metadata.estimatedMinutes', message: 'metadata.estimatedMinutes should be a non-negative integer' });
    }
  }

  // pages
  const pages = course.pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    errors.push({ path: '$.pages', code: 'REQUIRED', message: 'pages must be a non-empty array' });
    return { valid: errors.length === 0, errors, warnings, summary: buildValidationSummary(errors, warnings) };
  }

  const seenPageIds = new Set<string>();
  const seenBlockIds = new Set<string>();

  (pages as unknown[]).forEach((page, i) => {
    const p = page as Record<string, unknown>;
    const pagePath = `$.pages[${i}]`;

    // pageId
    const pageId = p.pageId as string | undefined;
    if (!isNonEmptyString(pageId)) {
      errors.push({ path: `${pagePath}.pageId`, code: 'REQUIRED', message: 'pageId is required and must be non-empty' });
    } else if (seenPageIds.has(pageId)) {
      errors.push({ path: `${pagePath}.pageId`, code: 'DUPLICATE_ID', message: `duplicate pageId "${pageId}"` });
    } else {
      seenPageIds.add(pageId);
    }

    // blocks
    const blocks = p.blocks;
    if (!Array.isArray(blocks)) {
      errors.push({ path: `${pagePath}.blocks`, code: 'INVALID_TYPE', message: 'page.blocks must be an array' });
      return;
    }

    (blocks as unknown[]).forEach((block, j) => {
      const b = block as Record<string, unknown>;
      const blockPath = `${pagePath}.blocks[${j}]`;

      // block.id
      const blockId = b.id as string | undefined;
      if (!isNonEmptyString(blockId)) {
        errors.push({ path: `${blockPath}.id`, code: 'REQUIRED', message: 'block.id is required and must be non-empty' });
      } else if (seenBlockIds.has(blockId)) {
        errors.push({ path: `${blockPath}.id`, code: 'DUPLICATE_ID', message: `duplicate block id "${blockId}"` });
      } else {
        seenBlockIds.add(blockId);
      }

      // block.type
      const blockType = b.type as string | undefined;
      if (!isNonEmptyString(blockType) || !VALID_BLOCK_TYPES.has(blockType)) {
        errors.push({
          path: `${blockPath}.type`,
          code: 'INVALID_VALUE',
          message: `block.type "${blockType}" is not one of the 10 valid types`,
        });
        return; // can't validate content without knowing type
      }

      // block.content
      if (!b.content || typeof b.content !== 'object' || Array.isArray(b.content)) {
        errors.push({ path: `${blockPath}.content`, code: 'INVALID_TYPE', message: 'block.content must be an object' });
        return;
      }

      validateBlockContent(b, blockPath, errors, warnings);
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: buildValidationSummary(errors, warnings),
  };
}

function buildValidationSummary(errors: SchemaError[], warnings: SchemaWarning[]): string {
  if (errors.length === 0 && warnings.length === 0) return 'Schema valid.';
  const parts: string[] = [];
  if (errors.length > 0) {
    const errorDetails = errors.slice(0, 3).map((e) => `[${e.path}] ${e.message}`).join('; ');
    const more = errors.length > 3 ? ` (+${errors.length - 3} more)` : '';
    parts.push(`${errors.length} error${errors.length > 1 ? 's' : ''}: ${errorDetails}${more}`);
  }
  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`);
  }
  const prefix = errors.length > 0 ? 'Schema validation failed: ' : 'Schema valid with warnings: ';
  return prefix + parts.join('; ');
}

// ────────────────────────────────────────────────────────────────────
// Request handler
// ────────────────────────────────────────────────────────────────────

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse(
      { success: false, error: 'Server configuration error: GEMINI_API_KEY not set' },
      500,
    );
  }

  // Parse request body
  let description: string;
  let difficulty: string;
  let animationStyle: string;
  let audience: string;
  let pdfBase64: string;
  let storageUrl: string;
  let fileName: string;
  try {
    const body = await req.json();
    description = (String(body.description ?? '')).trim();
    difficulty = String(body.difficulty ?? 'beginner');
    animationStyle = String(body.animationStyle ?? 'minimal');
    audience = String(body.audience ?? 'beginners');
    pdfBase64 = normalizeBase64(String(body.pdfBase64 ?? ''));
    storageUrl = String(body.storageUrl ?? '').trim();
    fileName = String(body.fileName ?? '').trim();
  } catch (_) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const wantsPdfMode = pdfBase64.length > 0 || storageUrl.length > 0;
  if (!wantsPdfMode && !description) {
    return jsonResponse(
      {
        success: false,
        error: 'description is required (or provide pdfBase64/storageUrl)',
      },
      400,
    );
  }

  if (wantsPdfMode) {
    if (!pdfBase64 && storageUrl) {
      try {
        pdfBase64 = await loadPdfBase64FromStorageUrl(storageUrl);
      } catch (e) {
        return jsonResponse(
          { success: false, error: `Failed to load PDF: ${e}` },
          400,
        );
      }
    }

    if (!pdfBase64) {
      return jsonResponse(
        { success: false, error: 'pdfBase64 is required for PDF mode' },
        400,
      );
    }

    const prompt = buildPdfPrompt(fileName);
    let lastError = 'No model succeeded';
    let lastValidationErrors: SchemaError[] | undefined;
    for (const model of MODEL_CANDIDATES) {
      const result = await callGeminiModelWithParts(
        model,
        [
          {
            inlineData: {
              mimeType: PDF_MIME_TYPE,
              data: pdfBase64,
            },
          },
          { text: prompt },
        ],
        apiKey,
        0.6,
      );

      if (!result.success || !result.content) {
        lastError = result.error ?? lastError;
        if (!shouldTryNextModel(result)) break;
        continue;
      }

      const courseJson = parseJsonObject(result.content);
      if (!courseJson) {
        const snippet = result.content.slice(0, 200).replace(/\n/g, ' ');
        lastError = `Could not parse JSON from model ${model} (first 200 chars: "${snippet}")`;
        continue;
      }

      const validation = validateCourseSchema(courseJson);
      if (!validation.valid) {
        lastError = validation.summary;
        lastValidationErrors = validation.errors;
        continue; // try next model — another model may produce valid output
      }

      const response: Record<string, unknown> = { success: true, courseJson, model, source: 'pdf' };
      if (validation.warnings.length > 0) response.warnings = validation.warnings;
      return jsonResponse(response);
    }

    const failBody: Record<string, unknown> = { success: false, error: lastError };
    if (lastValidationErrors) failBody.validationErrors = lastValidationErrors;
    return jsonResponse(failBody, 500);
  }

  const prompt = buildPrompt(description, difficulty, animationStyle, audience);

  // Try models in order
  let lastError = 'No model succeeded';
  let lastValidationErrors: SchemaError[] | undefined;
  for (const model of MODEL_CANDIDATES) {
    const result = await callGeminiModel(model, prompt, apiKey);

    if (!result.success || !result.content) {
      lastError = result.error ?? lastError;
      if (!shouldTryNextModel(result)) break;
      continue;
    }

    const courseJson = parseJsonObject(result.content);
    if (!courseJson) {
      const snippet = result.content.slice(0, 200).replace(/\n/g, ' ');
      lastError = `Could not parse JSON from model ${model} (first 200 chars: "${snippet}")`;
      continue;
    }

    const validation = validateCourseSchema(courseJson);
    if (!validation.valid) {
      lastError = validation.summary;
      lastValidationErrors = validation.errors;
      continue; // try next model — another model may produce valid output
    }

    const response: Record<string, unknown> = { success: true, courseJson, model };
    if (validation.warnings.length > 0) response.warnings = validation.warnings;
    return jsonResponse(response);
  }

  const failBody: Record<string, unknown> = { success: false, error: lastError };
  if (lastValidationErrors) failBody.validationErrors = lastValidationErrors;
  return jsonResponse(failBody, 500);
});
