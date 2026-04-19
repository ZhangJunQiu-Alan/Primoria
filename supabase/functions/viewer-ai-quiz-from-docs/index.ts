import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { QuizDslSchema, compileQuizDslToLessonContent, type QuizDsl } from './quizCompiler.ts';
import { extractNormalizedGeminiCandidateTexts } from '../_shared/geminiResponse.ts';
import {
  buildCourseSlug,
  buildQuizPrompt,
  type QuizOutputLanguage,
  type TutorDocumentRecord,
} from './quizHelpers.ts';
import { selectQuestionsForQuiz } from './quizRules.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_OUTPUT_TOKENS = 16384;
const MAX_COMBINED_TEXT_LENGTH = 70_000;
const DOCUMENT_SELECT_FIELDS = 'id, filename, display_title, extracted_text';
const LEGACY_DOCUMENT_SELECT_FIELDS = 'id, filename, extracted_text';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEnv(name: string) {
  const value = Deno.env.get(name)?.trim() ?? '';
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function createUserClient(authorization: string) {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}

function readDatabaseErrorText(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (!error || typeof error !== 'object') {
    return '';
  }

  const record = error as Record<string, unknown>;
  return ['message', 'details', 'hint', 'error_description']
    .map((key) => record[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .trim();
}

function isMissingDisplayTitleColumnError(error: unknown) {
  const message = readDatabaseErrorText(error).toLowerCase();
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const code = typeof record?.code === 'string' ? record.code : '';

  return (
    code === '42703' ||
    (message.includes('display_title') &&
      (message.includes('schema cache') ||
        message.includes('column') ||
        message.includes('does not exist') ||
        message.includes('could not find')))
  );
}

async function fetchTutorDocumentsForQuiz(
  client: ReturnType<typeof createUserClient>,
  documentIds: string[],
) {
  const primaryResult = await client
    .from('tutor_documents')
    .select(DOCUMENT_SELECT_FIELDS)
    .in('id', documentIds);

  if (!primaryResult.error) {
    return (primaryResult.data ?? []) as TutorDocumentRecord[];
  }

  if (!isMissingDisplayTitleColumnError(primaryResult.error)) {
    throw primaryResult.error;
  }

  const fallbackResult = await client
    .from('tutor_documents')
    .select(LEGACY_DOCUMENT_SELECT_FIELDS)
    .in('id', documentIds);

  if (fallbackResult.error) {
    throw fallbackResult.error;
  }

  return ((fallbackResult.data ?? []) as Array<Omit<TutorDocumentRecord, 'display_title'>>).map((document) => ({
    ...document,
    display_title: null,
  }));
}


async function ensureProfileExists(client: ReturnType<typeof createUserClient>, userId: string) {
  const { data, error } = await client.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (error) {
    throw error;
  }

  if (data) {
    return;
  }

  const { error: insertError } = await client.from('profiles').insert({ id: userId });
  if (insertError && insertError.code !== '23505') {
    throw insertError;
  }
}

const GEMINI_OVERLOADED_MESSAGES: Record<QuizOutputLanguage, string> = {
  'en': 'Please retry later — Gemini service is temporarily overloaded.',
  'zh-CN': '请稍后重试，这是 Gemini 服务端临时过载。',
};

function salvageQuizShape(parsed: unknown, fallbackTitle: string, fallbackDescription: string): unknown {
  if (Array.isArray(parsed)) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      difficulty: 'intermediate',
      questions: parsed,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const record = parsed as Record<string, unknown>;
  const inner =
    (record.quiz && typeof record.quiz === 'object' ? record.quiz : null) ??
    (record.data && typeof record.data === 'object' ? record.data : null);
  const base = (inner ?? record) as Record<string, unknown>;

  let questions = base.questions;
  if (!Array.isArray(questions)) {
    // if top-level object itself *is* a single question (unlikely), or questions key is named differently
    if (Array.isArray((record as Record<string, unknown>).items)) {
      questions = (record as Record<string, unknown>).items;
    } else if (Array.isArray((record as Record<string, unknown>).list)) {
      questions = (record as Record<string, unknown>).list;
    }
  }

  return {
    title: typeof base.title === 'string' && base.title.trim().length > 0 ? base.title : fallbackTitle,
    description:
      typeof base.description === 'string' && base.description.trim().length > 0
        ? base.description
        : fallbackDescription,
    difficulty: typeof base.difficulty === 'string' ? base.difficulty : 'intermediate',
    questions: Array.isArray(questions) ? questions : base.questions,
  };
}

async function generateQuizDsl(
  prompt: string,
  questionCount: number,
  language: QuizOutputLanguage,
  fallbackTitle: string,
  fallbackDescription: string,
) {
  const geminiApiKey = getEnv('GEMINI_API_KEY');
  let lastError = 'AI quiz generation failed.';
  let sawOverload = false;

  for (const model of [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((candidate) => candidate !== DEFAULT_MODEL)]) {
    const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'You generate exam review quizzes. Return valid JSON only.' }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 503 || response.status === 429) {
        sawOverload = true;
        lastError = GEMINI_OVERLOADED_MESSAGES[language];
      } else {
        lastError = `Gemini returned HTTP ${response.status}.`;
      }
      continue;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const candidateTexts = extractNormalizedGeminiCandidateTexts(payload);
    if (!candidateTexts.length) {
      lastError = 'Gemini returned an empty response.';
      continue;
    }

    console.log(
      `[viewer-ai-quiz-from-docs] model=${model} candidates=${candidateTexts.length} first_preview=${candidateTexts[0].slice(0, 240)}`,
    );

    let dsl: QuizDsl | null = null;
    let selectedQuestions: QuizDsl['questions'] | null = null;
    let candidateError = 'Gemini returned invalid quiz JSON.';

    for (const text of candidateTexts) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        candidateError = error instanceof Error ? error.message : 'invalid JSON';
        continue;
      }

      const salvaged = salvageQuizShape(parsed, fallbackTitle, fallbackDescription);
      try {
        dsl = QuizDslSchema.parse(salvaged);
      } catch (error) {
        candidateError = error instanceof Error ? error.message : 'schema validation failed';
        continue;
      }

      if (dsl.questions.length < questionCount) {
        candidateError = `Gemini returned only ${dsl.questions.length} questions.`;
        dsl = null;
        continue;
      }

      try {
        selectedQuestions = selectQuestionsForQuiz(dsl.questions, questionCount);
        break;
      } catch (error) {
        candidateError = error instanceof Error ? error.message : 'question selection failed';
        dsl = null;
        selectedQuestions = null;
        continue;
      }
    }

    if (!dsl || !selectedQuestions) {
      lastError = candidateError;
      continue;
    }

    return {
      ...dsl,
      difficulty: 'intermediate' as const,
      questions: selectedQuestions,
    };
  }

  if (sawOverload) {
    throw new Error(GEMINI_OVERLOADED_MESSAGES[language]);
  }
  throw new Error(lastError);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const client = createUserClient(authorization);
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const documentIds: string[] = Array.isArray(payload?.documentIds)
      ? payload.documentIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const dedupedDocumentIds: string[] = [...new Set(documentIds)];
    const questionCount = Number(payload?.questionCount ?? 10);
    const languageInput = typeof payload?.language === 'string' ? payload.language.trim() : '';
    const language: QuizOutputLanguage = languageInput === 'zh-CN' ? 'zh-CN' : 'en';

    if (!dedupedDocumentIds.length) {
      return new Response(JSON.stringify({ error: 'Please select at least one document.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Number.isInteger(questionCount) || questionCount < 5 || questionCount > 30) {
      return new Response(JSON.stringify({ error: 'questionCount must be an integer between 5 and 30.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const documentRows = await fetchTutorDocumentsForQuiz(client, dedupedDocumentIds);
    if (documentRows.length !== dedupedDocumentIds.length) {
      return new Response(JSON.stringify({ error: 'Some selected documents could not be found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderedDocuments = dedupedDocumentIds
      .map((id) => documentRows.find((document) => document.id === id) ?? null)
      .filter((document): document is TutorDocumentRecord => document !== null);

    const combinedTextLength = orderedDocuments.reduce((total, document) => total + document.extracted_text.length, 0);
    if (combinedTextLength > MAX_COMBINED_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: 'The selected documents are too long. Remove some and try again.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fallbackSource = orderedDocuments[0]?.display_title?.trim() || orderedDocuments[0]?.filename || 'Study Materials';
    const fallbackTitle = language === 'zh-CN' ? `${fallbackSource} · AI 复习测验` : `${fallbackSource} — AI Review Quiz`;
    const fallbackDescription =
      language === 'zh-CN'
        ? '由 AI 根据上传的学习资料自动生成的复习测验。'
        : 'An AI-generated review quiz based on your uploaded study materials.';

    const dsl = await generateQuizDsl(
      buildQuizPrompt(orderedDocuments, questionCount, language),
      questionCount,
      language,
      fallbackTitle,
      fallbackDescription,
    );
    const compiled = compileQuizDslToLessonContent(dsl);
    const courseId = crypto.randomUUID();

    await ensureProfileExists(client, authData.user.id);

    const { data: courseData, error: courseError } = await client
      .from('courses')
      .insert({
        id: courseId,
        author_id: authData.user.id,
        slug: buildCourseSlug(dsl.title, courseId),
        title: dsl.title,
        description: dsl.description,
        difficulty_level: 'intermediate',
        estimated_minutes: questionCount * 2,
        price_tier: 'free',
        price: 0,
        status: 'draft',
        tags: [],
      })
      .select('id, title')
      .single();

    if (courseError) {
      throw courseError;
    }

    const { error: lessonError } = await client.from('lessons').insert({
      id: compiled.lessonId,
      course_id: courseId,
      title: compiled.lessonTitle,
      sort_key: 1000,
      type: 'interactive',
      unlock_type: 'none',
      duration_seconds: questionCount * 120,
      content_json: compiled.contentJson,
    });

    if (lessonError) {
      await client.from('courses').delete().eq('id', courseId);
      throw lessonError;
    }

    return new Response(
      JSON.stringify({
        courseId,
        courseTitle: typeof courseData?.title === 'string' ? courseData.title : dsl.title,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[viewer-ai-quiz-from-docs] unexpected error', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
