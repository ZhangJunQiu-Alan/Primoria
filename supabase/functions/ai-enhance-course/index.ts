/**
 * POST /functions/v1/ai-enhance-course
 *
 * Human-in-the-loop course enhancement (Milestone 3D).
 * Called when the user accepts a quality suggestion after course generation.
 *
 * Request body:
 *   {
 *     courseId: string,
 *     type: 'add-interactive' | 'add-final-quiz'
 *   }
 *
 * Response (success):
 *   {
 *     success: true,
 *     message: string,
 *     lessonsUpdated?: number,   // for add-interactive
 *     lessonAdded?: boolean,     // for add-final-quiz
 *   }
 *
 * Response (error):
 *   { success: false, error: string, stage?: string }
 *
 * Required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import type { CoursePlanJson, CoursePlanLesson, LessonPageJson } from '../_shared/types/course_plan.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const INTERACTIVE_BLOCK_TYPES = new Set([
  'code-playground', 'multiple-choice', 'fill-blank', 'true-false', 'matching',
]);

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, stage: string, status = 500): Response {
  return jsonResponse({ success: false, error, stage }, status);
}

function hasInteractiveBlock(contentJson: Record<string, unknown> | null | undefined): boolean {
  if (!contentJson || typeof contentJson !== 'object') return false;
  const blocks = contentJson.blocks as unknown[] | undefined;
  if (!Array.isArray(blocks)) return false;
  return (blocks as Record<string, unknown>[]).some((b) =>
    INTERACTIVE_BLOCK_TYPES.has(b.type as string),
  );
}

async function callGenerateLessonBlocks(
  lessonPlan: CoursePlanLesson,
  courseContext: Record<string, unknown>,
  qualityHints: string[],
  supabaseUrl: string,
  serviceKey: string,
): Promise<LessonPageJson | null> {
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/ai-generate-lesson-blocks`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey':        serviceKey,
      },
      body: JSON.stringify({ lessonPlan, courseContext, qualityHints }),
    });
  } catch (_) {
    return null;
  }

  let body: Record<string, unknown>;
  try { body = await response.json(); }
  catch (_) { return null; }

  if (!response.ok || !body.success) return null;
  return body.page as LessonPageJson;
}

// ────────────────────────────────────────────────────────────────────
// Enhancement: add interactive blocks to lessons that have none
// ────────────────────────────────────────────────────────────────────

async function addInteractive(
  courseId: string,
  userId:   string,
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceKey:  string,
): Promise<{ lessonsUpdated: number }> {
  // 1. Fetch course with planning_json
  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .select('planning_json, animation_style, content_language, difficulty_level, title, description')
    .eq('id', courseId)
    .eq('author_id', userId)
    .maybeSingle();

  if (courseErr || !courseRow) {
    throw new Error('Course not found or access denied');
  }

  const planJson = courseRow.planning_json as CoursePlanJson | null;
  if (!planJson?.lessons) {
    throw new Error('Course has no planning_json; cannot re-generate interactives');
  }

  // 2. Fetch all lessons
  const { data: lessonRows, error: lessonsErr } = await supabase
    .from('lessons')
    .select('id, sort_key, content_json')
    .eq('course_id', courseId)
    .order('sort_key', { ascending: true });

  if (lessonsErr || !lessonRows) {
    throw new Error(`Failed to fetch lessons: ${lessonsErr?.message ?? 'unknown'}`);
  }

  const courseContext = {
    title:           courseRow.title as string,
    subject:         planJson.course.subject,
    difficulty:      courseRow.difficulty_level as string,
    target_audience: planJson.course.target_audience,
    animation_style: (courseRow.animation_style ?? 'minimal') as string,
    language:        (courseRow.content_language ?? 'zh') as string,
  };

  const qualityHints = [
    'Add at least 1 interactive block (multiple-choice, fill-blank, true-false, matching, or code-playground) to reinforce active learning in this lesson.',
    'Add at least 1 question block (multiple-choice, fill-blank, true-false, or matching) to check comprehension.',
  ];

  let lessonsUpdated = 0;

  for (const lessonRow of lessonRows as Array<{ id: string; sort_key: number; content_json: Record<string, unknown> | null }>) {
    const contentJson = lessonRow.content_json;
    if (hasInteractiveBlock(contentJson)) continue; // already has interactive blocks

    // Match with plan lesson by order (sort_key = order × 1000)
    const order = Math.round(lessonRow.sort_key / 1000);
    const planLesson = planJson.lessons.find((l) => l.order === order);
    if (!planLesson) continue;

    const page = await callGenerateLessonBlocks(
      planLesson, courseContext, qualityHints, supabaseUrl, serviceKey,
    );
    if (!page) continue; // best-effort: skip on error

    const { error: updateErr } = await supabase
      .from('lessons')
      .update({ content_json: { blocks: page.blocks } })
      .eq('id', lessonRow.id);

    if (!updateErr) lessonsUpdated++;
  }

  return { lessonsUpdated };
}

// ────────────────────────────────────────────────────────────────────
// Enhancement: append a final quiz lesson
// ────────────────────────────────────────────────────────────────────

async function addFinalQuiz(
  courseId: string,
  userId:   string,
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceKey:  string,
): Promise<{ lessonAdded: boolean }> {
  // 1. Fetch course with planning_json
  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .select('planning_json, animation_style, content_language, difficulty_level, title, description')
    .eq('id', courseId)
    .eq('author_id', userId)
    .maybeSingle();

  if (courseErr || !courseRow) {
    throw new Error('Course not found or access denied');
  }

  const planJson = courseRow.planning_json as CoursePlanJson | null;

  // 2. Get max sort_key to place the quiz at the end
  const { data: maxRow } = await supabase
    .from('lessons')
    .select('sort_key')
    .eq('course_id', courseId)
    .order('sort_key', { ascending: false })
    .limit(1)
    .maybeSingle();

  const maxSortKey = (maxRow as { sort_key: number } | null)?.sort_key ?? 0;
  const quizOrder  = Math.round(maxSortKey / 1000) + 1;

  // 3. Build a synthetic quiz lesson plan
  const language = (courseRow.content_language ?? 'zh') as string;
  const keyPoints = planJson?.lessons.map((l) => l.title) ??
    ['Course concepts', 'Key definitions'];

  const quizLesson: CoursePlanLesson = {
    order:             quizOrder,
    title:             language === 'zh' ? '期末测验' : 'Final Quiz',
    objective:         language === 'zh'
      ? '全面测试本课程所有核心知识点的掌握程度'
      : 'Comprehensive test of all core concepts from this course',
    key_points:        keyPoints.slice(0, 6),
    type:              'quiz',
    estimated_minutes: 10,
    xp_reward:         150,
  };

  const courseContext = {
    title:           courseRow.title as string,
    subject:         planJson?.course.subject ?? 'Computer Science',
    difficulty:      courseRow.difficulty_level as string,
    target_audience: planJson?.course.target_audience ?? '',
    animation_style: (courseRow.animation_style ?? 'minimal') as string,
    language,
  };

  const qualityHints = [
    'This is a final quiz lesson. Use ONLY question blocks (multiple-choice, fill-blank, true-false, matching). No text blocks.',
    'Include questions covering all major topics from the course.',
  ];

  // 4. Generate quiz blocks
  const page = await callGenerateLessonBlocks(
    quizLesson, courseContext, qualityHints, supabaseUrl, serviceKey,
  );
  if (!page) throw new Error('Failed to generate quiz lesson content');

  // 5. Insert new lesson row
  const { error: insertErr } = await supabase.from('lessons').insert({
    course_id:        courseId,
    title:            quizLesson.title,
    type:             'quiz',
    sort_key:         maxSortKey + 1000,
    xp_reward:        quizLesson.xp_reward,
    duration_seconds: quizLesson.estimated_minutes * 60,
    is_locked:        true,
    content_json:     { blocks: page.blocks },
  });

  if (insertErr) throw new Error(`Failed to insert quiz lesson: ${insertErr.message}`);

  return { lessonAdded: true };
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return errorResponse('Missing required environment variables', 'init');
  }

  // ── Auth ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return errorResponse('Unauthorized — valid session required', 'auth', 401);
  }
  const userId = user.id;

  // ── Parse body ────────────────────────────────────────────────────
  let courseId: string;
  let type: string;
  try {
    const body = await req.json();
    courseId = String(body.courseId ?? '').trim();
    type     = String(body.type     ?? '').trim();
    if (!courseId) throw new Error('courseId is required');
    if (type !== 'add-interactive' && type !== 'add-final-quiz') {
      throw new Error('type must be add-interactive or add-final-quiz');
    }
  } catch (e) {
    return errorResponse(`Invalid request: ${e}`, 'parse', 400);
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    if (type === 'add-interactive') {
      const { lessonsUpdated } = await addInteractive(
        courseId, userId, adminClient, supabaseUrl, serviceKey,
      );
      const message = lessonsUpdated > 0
        ? `已为 ${lessonsUpdated} 课添加互动练习`
        : '所有课程已有互动练习，无需更新';
      return jsonResponse({ success: true, message, lessonsUpdated });
    } else {
      const { lessonAdded } = await addFinalQuiz(
        courseId, userId, adminClient, supabaseUrl, serviceKey,
      );
      return jsonResponse({
        success: true,
        message: '期末测验已添加',
        lessonAdded,
      });
    }
  } catch (e) {
    return errorResponse(`Enhancement failed: ${e}`, type);
  }
});
