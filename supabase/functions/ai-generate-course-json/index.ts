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
const MAX_OUTPUT_TOKENS = 16384;
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

JSON schema:
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
      "title": "Page title",
      "blocks": [...]
    }
  ]
}

Hard constraints:
- Put all generated blocks into exactly ONE page.
- Total block count must be <= 20.
- Prefer 10-20 blocks when content is sufficient; for short topics 6-12 is acceptable.
- Every id must be unique.
- position.order must be continuous from 0.
- Use \\n for newlines in text.
- Keep metadata concise and useful.

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
- Keep an explain-practice rhythm: usually 1 assessment block after every 1-2 concept blocks.
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
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = (content?.parts as unknown[]) ?? [];
  const firstPart = parts[0] as Record<string, unknown> | undefined;
  const text = firstPart?.text as string | undefined;

  if (!text?.trim()) {
    return { success: false, error: `Model ${model} returned empty content` };
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
        lastError = `Could not parse JSON from model ${model} output`;
        continue;
      }

      return jsonResponse({ success: true, courseJson, model, source: 'pdf' });
    }

    return jsonResponse({ success: false, error: lastError }, 500);
  }

  const prompt = buildPrompt(description, difficulty, animationStyle, audience);

  // Try models in order
  let lastError = 'No model succeeded';
  for (const model of MODEL_CANDIDATES) {
    const result = await callGeminiModel(model, prompt, apiKey);

    if (!result.success || !result.content) {
      lastError = result.error ?? lastError;
      if (!shouldTryNextModel(result)) break;
      continue;
    }

    const courseJson = parseJsonObject(result.content);
    if (!courseJson) {
      lastError = `Could not parse JSON from model ${model} output`;
      continue;
    }

    return jsonResponse({ success: true, courseJson, model });
  }

  return jsonResponse({ success: false, error: lastError }, 500);
});
