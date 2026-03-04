/**
 * POST /functions/v1/utils-validate-course-json
 *
 * Standalone Course JSON schema validator.
 * Used as a tool by the agentic pipeline (Milestone 3A).
 *
 * Request body:  { courseJson: object }
 * Response:      { passed: boolean, errors: SchemaError[], warnings: SchemaWarning[], summary: string }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ────────────────────────────────────────────────────────────────────
// Schema validation (mirrors Flutter CourseSchemaValidator + server copy
// in ai-generate-course-json)
// ────────────────────────────────────────────────────────────────────

export interface SchemaError {
  path:    string;
  code:    string;
  message: string;
}

export interface SchemaWarning {
  path:    string;
  message: string;
}

export interface SchemaValidationResult {
  passed:   boolean;
  errors:   SchemaError[];
  warnings: SchemaWarning[];
  summary:  string;
}

const VALID_BLOCK_TYPES = new Set([
  'text', 'image', 'code-block', 'code-playground',
  'multiple-choice', 'fill-blank', 'true-false', 'matching',
  'video', 'animation', 'function-flow',
]);

const VALID_DIFFICULTIES     = new Set(['beginner', 'intermediate', 'advanced']);
const VALID_ANIMATION_PRESETS = new Set(['bouncing-dot', 'pulse-bars']);

function isStr(v: unknown): v is string {
  return typeof v === 'string' && (v as string).trim().length > 0;
}

function isNonNegInt(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && (v as number) >= 0;
}

function validateBlockContent(
  block: Record<string, unknown>,
  blockPath: string,
  errors: SchemaError[],
  warnings: SchemaWarning[],
): void {
  const content = block.content as Record<string, unknown> | undefined;
  const type    = block.type as string;
  const cp      = `${blockPath}.content`;

  switch (type) {
    case 'text':
      if (!isStr(content?.value))
        errors.push({ path: `${cp}.value`, code: 'REQUIRED', message: 'text block content.value is required' });
      break;
    case 'image':
      if (!isStr(content?.url))
        errors.push({ path: `${cp}.url`, code: 'REQUIRED', message: 'image block content.url is required' });
      break;
    case 'code-block':
      if (content?.code === undefined || content?.code === null)
        errors.push({ path: `${cp}.code`, code: 'REQUIRED', message: 'code-block content.code is required' });
      break;
    case 'code-playground':
      if (content?.initialCode === undefined || content?.initialCode === null)
        errors.push({ path: `${cp}.initialCode`, code: 'REQUIRED', message: 'code-playground content.initialCode is required' });
      break;
    case 'multiple-choice': {
      if (!isStr(content?.question))
        errors.push({ path: `${cp}.question`, code: 'REQUIRED', message: 'multiple-choice content.question is required' });
      const opts = content?.options;
      if (!Array.isArray(opts) || opts.length < 2)
        errors.push({ path: `${cp}.options`, code: 'INVALID_VALUE', message: 'multiple-choice must have ≥2 options' });
      if (content?.correctAnswer === undefined && content?.correctAnswers === undefined)
        errors.push({ path: `${cp}.correctAnswer`, code: 'REQUIRED', message: 'multiple-choice must have correctAnswer or correctAnswers' });
      break;
    }
    case 'fill-blank':
      if (!isStr(content?.question))
        errors.push({ path: `${cp}.question`, code: 'REQUIRED', message: 'fill-blank content.question is required' });
      if (!isStr(content?.correctAnswer))
        errors.push({ path: `${cp}.correctAnswer`, code: 'REQUIRED', message: 'fill-blank content.correctAnswer is required' });
      break;
    case 'true-false':
      if (typeof content?.correctAnswer !== 'boolean')
        errors.push({ path: `${cp}.correctAnswer`, code: 'INVALID_TYPE', message: 'true-false correctAnswer must be boolean' });
      break;
    case 'matching': {
      const left  = content?.leftItems;
      const right = content?.rightItems;
      if (!Array.isArray(left)  || left.length  < 2)
        errors.push({ path: `${cp}.leftItems`,  code: 'INVALID_VALUE', message: 'matching leftItems must have ≥2 items' });
      if (!Array.isArray(right) || right.length < 2)
        errors.push({ path: `${cp}.rightItems`, code: 'INVALID_VALUE', message: 'matching rightItems must have ≥2 items' });
      if (!Array.isArray(content?.correctPairs) || (content?.correctPairs as unknown[]).length === 0)
        errors.push({ path: `${cp}.correctPairs`, code: 'REQUIRED', message: 'matching correctPairs must be a non-empty array' });
      break;
    }
    case 'animation': {
      const preset = content?.preset as string;
      if (!VALID_ANIMATION_PRESETS.has(preset))
        warnings.push({ path: `${cp}.preset`, message: `animation preset "${preset}" is not a known value` });
      break;
    }
    case 'video':
      if (!isStr(content?.url))
        errors.push({ path: `${cp}.url`, code: 'REQUIRED', message: 'video block content.url is required' });
      break;
    case 'function-flow': {
      const nodes = content?.nodes;
      if (!Array.isArray(nodes) || nodes.length === 0)
        errors.push({ path: `${cp}.nodes`, code: 'REQUIRED', message: 'function-flow content.nodes must be a non-empty array' });
      break;
    }
  }
}

export function validateCourseSchema(json: unknown): SchemaValidationResult {
  const errors:   SchemaError[]   = [];
  const warnings: SchemaWarning[] = [];

  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    errors.push({ path: '$', code: 'INVALID_TYPE', message: 'Course JSON must be an object' });
    return { passed: false, errors, warnings, summary: buildSummary(errors, warnings) };
  }

  const course = json as Record<string, unknown>;

  if (!isStr(course.courseId))
    errors.push({ path: '$.courseId', code: 'REQUIRED', message: 'courseId is required' });

  const meta = course.metadata as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== 'object') {
    errors.push({ path: '$.metadata', code: 'REQUIRED', message: 'metadata object is required' });
  } else {
    if (!isStr(meta.title))
      errors.push({ path: '$.metadata.title', code: 'REQUIRED', message: 'metadata.title is required' });
    if (meta.difficulty !== undefined && !VALID_DIFFICULTIES.has(meta.difficulty as string))
      warnings.push({ path: '$.metadata.difficulty', message: `difficulty "${meta.difficulty}" should be beginner/intermediate/advanced` });
    if (meta.estimatedMinutes !== undefined && !isNonNegInt(meta.estimatedMinutes))
      warnings.push({ path: '$.metadata.estimatedMinutes', message: 'estimatedMinutes should be a non-negative integer' });
  }

  // Accept both 'lessons' (new) and legacy 'pages' key
  const lessons = (course as Record<string, unknown>).lessons ?? (course as Record<string, unknown>).pages;
  if (!Array.isArray(lessons) || lessons.length === 0) {
    errors.push({ path: '$.lessons', code: 'REQUIRED', message: 'lessons must be a non-empty array' });
    return { passed: errors.length === 0, errors, warnings, summary: buildSummary(errors, warnings) };
  }

  const seenLessonIds = new Set<string>();
  const seenBlockIds  = new Set<string>();

  (lessons as unknown[]).forEach((lesson, i) => {
    const p          = lesson as Record<string, unknown>;
    const lessonPath = `$.lessons[${i}]`;
    // Accept both 'lessonId' (new) and legacy 'pageId'
    const lessonId   = (p.lessonId ?? p.pageId) as string | undefined;

    if (!isStr(lessonId)) {
      errors.push({ path: `${lessonPath}.lessonId`, code: 'REQUIRED', message: 'lessonId is required' });
    } else if (seenLessonIds.has(lessonId)) {
      errors.push({ path: `${lessonPath}.lessonId`, code: 'DUPLICATE_ID', message: `duplicate lessonId "${lessonId}"` });
    } else {
      seenLessonIds.add(lessonId);
    }

    const blocks = p.blocks;
    if (!Array.isArray(blocks)) {
      errors.push({ path: `${lessonPath}.blocks`, code: 'INVALID_TYPE', message: 'lesson.blocks must be an array' });
      return;
    }

    (blocks as unknown[]).forEach((block, j) => {
      const b         = block as Record<string, unknown>;
      const blockPath = `${lessonPath}.blocks[${j}]`;
      const blockId   = b.id as string | undefined;

      if (!isStr(blockId)) {
        errors.push({ path: `${blockPath}.id`, code: 'REQUIRED', message: 'block.id is required' });
      } else if (seenBlockIds.has(blockId)) {
        errors.push({ path: `${blockPath}.id`, code: 'DUPLICATE_ID', message: `duplicate block id "${blockId}"` });
      } else {
        seenBlockIds.add(blockId);
      }

      const blockType = b.type as string | undefined;
      if (!isStr(blockType) || !VALID_BLOCK_TYPES.has(blockType)) {
        errors.push({ path: `${blockPath}.type`, code: 'INVALID_VALUE', message: `block.type "${blockType}" is not a valid type` });
        return;
      }
      if (!b.content || typeof b.content !== 'object' || Array.isArray(b.content)) {
        errors.push({ path: `${blockPath}.content`, code: 'INVALID_TYPE', message: 'block.content must be an object' });
        return;
      }
      validateBlockContent(b, blockPath, errors, warnings);
    });
  });

  return { passed: errors.length === 0, errors, warnings, summary: buildSummary(errors, warnings) };
}

function buildSummary(errors: SchemaError[], warnings: SchemaWarning[]): string {
  if (errors.length === 0 && warnings.length === 0) return 'Schema valid.';
  const parts: string[] = [];
  if (errors.length > 0) {
    const details = errors.slice(0, 3).map((e) => `[${e.path}] ${e.message}`).join('; ');
    const more    = errors.length > 3 ? ` (+${errors.length - 3} more)` : '';
    parts.push(`${errors.length} error${errors.length > 1 ? 's' : ''}: ${details}${more}`);
  }
  if (warnings.length > 0)
    parts.push(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`);
  return (errors.length > 0 ? 'Schema invalid: ' : 'Schema valid with warnings: ') + parts.join('; ');
}

// ────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST')
    return jsonResponse({ error: 'Method not allowed' }, 405);

  let courseJson: unknown;
  try {
    const body = await req.json();
    courseJson  = body.courseJson ?? body; // accept either { courseJson: ... } or bare object
  } catch (_) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const result = validateCourseSchema(courseJson);
  return jsonResponse(result);
});
