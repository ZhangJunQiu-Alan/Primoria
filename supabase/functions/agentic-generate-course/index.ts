/**
 * POST /functions/v1/agentic-generate-course
 *
 * Milestone 2 orchestrator. Calls sub-functions sequentially:
 *   1. ai-plan-course       → CoursePlanJson
 *   2. ai-generate-lesson-blocks × N  → LessonPageJson[]
 *   3. Assemble + validate CourseJson
 *   4. Write courses + lessons to database
 *
 * Request body:
 *   {
 *     description:     string,   // required
 *     difficulty?:     string,   // beginner | intermediate | advanced
 *     animationStyle?: string,   // cartoon | minimal | realistic
 *     language?:       string,   // zh | en
 *   }
 *
 * Response (success):
 *   { success: true, courseId: string, lessonCount: number, planJson: CoursePlanJson }
 *
 * Response (error):
 *   { success: false, error: string, stage?: string }
 *
 * Required env vars (set at Supabase project level):
 *   GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * Timeout note: 1 plan call + N lesson calls (N = 3-8) ≈ 20-60 s.
 * Keep lesson count ≤ 6 for comfortable headroom within the 60-s default limit.
 */

import type { CoursePlanJson, LessonPageJson } from '../_shared/types/course_plan.ts';
import { evaluateCourseQuality } from '../_shared/quality.ts';
import type { QualityReport } from '../_shared/quality.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_DIFFICULTIES    = new Set(['beginner', 'intermediate', 'advanced']);
const VALID_ANIMATION_STYLES = new Set(['cartoon', 'minimal', 'realistic']);
const VALID_LANGUAGES       = new Set(['zh', 'en']);

// ────────────────────────────────────────────────────────────────────
// Sub-function caller
// ────────────────────────────────────────────────────────────────────

type SubFnResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string };

async function callSubFunction<T>(
  functionName: string,
  payload: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
): Promise<SubFnResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use service role key so internal calls bypass auth entirely
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { success: false, error: `Network error calling ${functionName}: ${e}` };
  }

  let body: Record<string, unknown>;
  try {
    body = await response.json();
  } catch (e) {
    return { success: false, error: `Failed to parse response from ${functionName}: ${e}` };
  }

  if (!response.ok || !body.success) {
    return {
      success: false,
      error: String(body.error ?? `${functionName} returned status ${response.status}`),
    };
  }

  return { success: true, data: body as unknown as T };
}

// ────────────────────────────────────────────────────────────────────
// CourseJson assembly
// ────────────────────────────────────────────────────────────────────

interface CourseJson {
  $schema:       string;
  schemaVersion: string;
  courseId:      string;
  metadata: {
    title:            string;
    description:      string;
    tags:             string[];
    difficulty:       string;
    estimatedMinutes: number;
  };
  pages: Array<{
    pageId:  string;
    title:   string;
    blocks:  unknown[];
  }>;
}

function buildCourseJson(plan: CoursePlanJson, lessonPages: LessonPageJson[]): CourseJson {
  return {
    $schema:       'https://primoria.com/course-schema/v1.json',
    schemaVersion: '1.0.0',
    courseId:      `ai-${Date.now()}`,
    metadata: {
      title:            plan.course.title,
      description:      plan.course.description,
      tags:             plan.course.tags,
      difficulty:       plan.course.difficulty,
      estimatedMinutes: plan.course.estimated_total_minutes,
    },
    pages: lessonPages.map((page, i) => ({
      pageId: `l${i + 1}`,
      title:  page.pageTitle,
      blocks: page.blocks,
    })),
  };
}

// ────────────────────────────────────────────────────────────────────
// Minimal CourseJson validation (full block-level validation already
// happened inside ai-generate-lesson-blocks for each page)
// ────────────────────────────────────────────────────────────────────

function validateAssembledCourse(course: CourseJson): string | null {
  if (!course.metadata?.title?.trim()) return 'metadata.title is empty';
  if (!Array.isArray(course.pages) || course.pages.length === 0) return 'pages array is empty';
  for (let i = 0; i < course.pages.length; i++) {
    const page = course.pages[i];
    if (!Array.isArray(page.blocks) || page.blocks.length === 0) {
      return `pages[${i}] has no blocks`;
    }
  }
  return null; // valid
}

// ────────────────────────────────────────────────────────────────────
// DB helpers
// ────────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

function toSlug(title: string): string {
  // Handle Unicode titles (e.g. Chinese) gracefully
  const ascii = title.replace(/[^\x00-\x7F]/g, '').trim();
  const base  = ascii
    ? ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'course';
  return `${base || 'course'}-${Date.now().toString(36)}`;
}

async function lookupSubjectId(
  subjectName: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase
    .from('subjects')
    .select('id')
    .eq('name', subjectName)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function writeToDb(
  plan: CoursePlanJson,
  lessonPages: LessonPageJson[],
  userId: string,
  supabase: SupabaseClient,
): Promise<string> {
  // 1. Subject lookup
  const subjectId = await lookupSubjectId(plan.course.subject, supabase);

  // 2. Insert course row
  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .insert({
      author_id:         userId,
      subject_id:        subjectId,          // null if not found — field is nullable
      title:             plan.course.title,
      slug:              toSlug(plan.course.title),
      description:       plan.course.description,
      difficulty_level:  plan.course.difficulty,
      estimated_minutes: plan.course.estimated_total_minutes,
      tags:              plan.course.tags,
      animation_style:   plan.course.animation_style,
      content_language:  plan.course.language,
      planning_json:     plan,               // full CoursePlanJson for Phase 2C re-use
      status:            'draft',
    })
    .select('id')
    .single();

  if (courseErr || !courseRow) {
    throw new Error(`Failed to insert course: ${courseErr?.message ?? 'unknown'}`);
  }

  const courseId = (courseRow as { id: string }).id;

  // 3. Insert lessons (bulk)
  const lessonRows = plan.lessons.map((lesson, i) => ({
    course_id:        courseId,
    title:            lesson.title,
    type:             lesson.type,
    sort_key:         lesson.order * 1000,   // spaced for future inserts
    xp_reward:        lesson.xp_reward,
    duration_seconds: lesson.estimated_minutes * 60,
    is_locked:        lesson.order > 1,      // first lesson unlocked by default
    content_json:     { blocks: lessonPages[i].blocks },
  }));

  const { error: lessonsErr } = await supabase.from('lessons').insert(lessonRows);
  if (lessonsErr) {
    throw new Error(`Failed to insert lessons: ${lessonsErr.message}`);
  }

  return courseId;
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

function errorResponse(error: string, stage: string, status = 500): Response {
  return jsonResponse({ success: false, error, stage }, status);
}

// ────────────────────────────────────────────────────────────────────
// Request handler
// ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  // ── Env vars ──────────────────────────────────────────────────────
  const supabaseUrl  = Deno.env.get('SUPABASE_URL');
  const anonKey      = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return errorResponse('Missing required environment variables', 'init');
  }

  // ── Auth: verify user JWT ─────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return errorResponse('Unauthorized — valid session required', 'auth', 401);
  }
  const userId = user.id;

  // ── Parse request body ────────────────────────────────────────────
  let description: string;
  let difficulty: string;
  let animationStyle: string;
  let language: string;
  try {
    const body = await req.json();
    description   = String(body.description   ?? '').trim();
    difficulty    = String(body.difficulty    ?? 'beginner');
    animationStyle = String(body.animationStyle ?? 'minimal');
    language      = String(body.language      ?? 'zh');
  } catch (_) {
    return errorResponse('Invalid JSON body', 'parse', 400);
  }

  if (!description) {
    return errorResponse('description is required', 'parse', 400);
  }

  // Normalise optional params
  if (!VALID_DIFFICULTIES.has(difficulty))        difficulty     = 'beginner';
  if (!VALID_ANIMATION_STYLES.has(animationStyle)) animationStyle = 'minimal';
  if (!VALID_LANGUAGES.has(language))             language       = 'zh';

  // ── Stage 1: plan course ──────────────────────────────────────────
  const planResult = await callSubFunction<{ planJson: CoursePlanJson }>(
    'ai-plan-course',
    { description, difficulty, animationStyle, language },
    supabaseUrl,
    serviceKey,
  );
  if (!planResult.success) {
    return errorResponse(`Course planning failed: ${planResult.error}`, 'plan');
  }
  const planJson = planResult.data.planJson;

  // ── Stage 2: generate blocks for each lesson ──────────────────────
  const courseContext = {
    title:           planJson.course.title,
    subject:         planJson.course.subject,
    difficulty:      planJson.course.difficulty,
    target_audience: planJson.course.target_audience,
    animation_style: planJson.course.animation_style,
    language:        planJson.course.language,
  };

  const lessonPages: LessonPageJson[] = [];

  for (const lesson of planJson.lessons) {
    const lessonResult = await callSubFunction<{ page: LessonPageJson }>(
      'ai-generate-lesson-blocks',
      { lessonPlan: lesson, courseContext },
      supabaseUrl,
      serviceKey,
    );
    if (!lessonResult.success) {
      return errorResponse(
        `Lesson ${lesson.order} block generation failed: ${lessonResult.error}`,
        `lesson-${lesson.order}`,
      );
    }
    lessonPages.push(lessonResult.data.page);
  }

  // ── Stage 3: assemble + validate CourseJson ───────────────────────
  let courseJson = buildCourseJson(planJson, lessonPages);
  const validationError = validateAssembledCourse(courseJson);
  if (validationError) {
    return errorResponse(`Course assembly validation failed: ${validationError}`, 'validate');
  }

  // ── Stage 3.5: quality check + one-pass improvement ───────────────
  let qualityReport: QualityReport = evaluateCourseQuality(courseJson);

  if (!qualityReport.passed) {
    // Collect fixable per-lesson issues (MISSING_INTERACTIVE, TEXT_TOO_LONG)
    const fixableTypes = new Set(['MISSING_INTERACTIVE', 'TEXT_TOO_LONG']);
    const hintsByLesson = new Map<number, string[]>();

    for (const issue of qualityReport.issues) {
      if (issue.lessonIndex >= 0 && fixableTypes.has(issue.type)) {
        const hints = hintsByLesson.get(issue.lessonIndex) ?? [];
        hints.push(issue.qualityHint);
        hintsByLesson.set(issue.lessonIndex, hints);
      }
    }

    // Also spread LOW_QUESTION_COUNT hint into any lesson being regenerated
    const lowQIssue = qualityReport.issues.find((i) => i.type === 'LOW_QUESTION_COUNT');
    if (lowQIssue && hintsByLesson.size > 0) {
      for (const [idx, hints] of hintsByLesson) {
        hints.push(lowQIssue.qualityHint);
        hintsByLesson.set(idx, hints);
      }
    }

    // Re-generate each affected lesson (best-effort; keep original on failure)
    if (hintsByLesson.size > 0) {
      for (const [lessonIdx, qualityHints] of hintsByLesson) {
        const lesson = planJson.lessons[lessonIdx];
        if (!lesson) continue;

        const regenResult = await callSubFunction<{ page: LessonPageJson }>(
          'ai-generate-lesson-blocks',
          { lessonPlan: lesson, courseContext, qualityHints },
          supabaseUrl,
          serviceKey,
        );

        if (regenResult.success) {
          lessonPages[lessonIdx] = regenResult.data.page;
        }
        // On failure: keep original page — do not abort the whole generation
      }

      // Rebuild and re-validate after improvements
      courseJson = buildCourseJson(planJson, lessonPages);
      const revalidErr = validateAssembledCourse(courseJson);
      if (revalidErr) {
        return errorResponse(`Course re-assembly after quality improvement failed: ${revalidErr}`, 'quality-improve');
      }

      // Update quality report to reflect the improved course
      qualityReport = evaluateCourseQuality(courseJson);
    }
  }

  // ── Stage 4: write to database ────────────────────────────────────
  const adminClient = createClient(supabaseUrl, serviceKey);
  let courseId: string;
  try {
    courseId = await writeToDb(planJson, lessonPages, userId, adminClient);
  } catch (e) {
    return errorResponse(`Database write failed: ${e}`, 'db');
  }

  // ── Done ──────────────────────────────────────────────────────────
  return jsonResponse({
    success:       true,
    courseId,
    lessonCount:   lessonPages.length,
    planJson,
    qualityReport: {
      score:   qualityReport.score,
      passed:  qualityReport.passed,
      issues:  qualityReport.issues,
      summary: qualityReport.summary,
    },
  });
});
