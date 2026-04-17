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

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_OUTPUT_TOKENS = 8192;
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

async function generateQuizDsl(prompt: string, questionCount: number) {
  const geminiApiKey = getEnv('GEMINI_API_KEY');
  let lastError = 'AI quiz generation failed.';

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
      lastError = `Gemini returned HTTP ${response.status}.`;
      continue;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const candidateTexts = extractNormalizedGeminiCandidateTexts(payload);
    if (!candidateTexts.length) {
      lastError = 'Gemini returned an empty response.';
      continue;
    }

    let parsed: unknown;
    let parsedSuccessfully = false;
    for (const text of candidateTexts) {
      try {
        parsed = JSON.parse(text);
        parsedSuccessfully = true;
        break;
      } catch {
        continue;
      }
    }

    if (!parsedSuccessfully) {
      lastError = 'Gemini returned invalid JSON.';
      continue;
    }

    let dsl: QuizDsl;
    try {
      dsl = QuizDslSchema.parse(parsed);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Quiz schema validation failed.';
      continue;
    }

    if (dsl.questions.length < questionCount) {
      lastError = `Gemini returned only ${dsl.questions.length} questions.`;
      continue;
    }

    return {
      ...dsl,
      difficulty: 'intermediate' as const,
      questions: dsl.questions.slice(0, questionCount),
    };
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

    const dsl = await generateQuizDsl(buildQuizPrompt(orderedDocuments, questionCount, language), questionCount);
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
