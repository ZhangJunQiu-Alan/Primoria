/**
 * POST /functions/v1/utils-evaluate-course-quality
 *
 * Standalone course quality checker.
 * Used as a tool by the agentic pipeline (Milestone 3C).
 *
 * Request body:  { courseJson: object }
 * Response:      { score: number, passed: boolean, issues: QualityIssue[], summary: string }
 */

import { evaluateCourseQuality } from '../_shared/quality.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    courseJson  = body.courseJson ?? body; // accept both { courseJson: ... } and bare object
  } catch (_) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const result = evaluateCourseQuality(courseJson);
  return jsonResponse(result);
});
