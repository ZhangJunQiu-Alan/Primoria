import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { QuizDslSchema, compileQuizDslToLessonContent, type QuizDsl } from './quizCompiler.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_OUTPUT_TOKENS = 8192;
const MAX_COMBINED_TEXT_LENGTH = 60_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TutorDocumentRecord = {
  id: string;
  filename: string;
  extracted_text: string;
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

function buildCourseSlug(title: string, courseId: string) {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const fallback = normalized.length > 0 ? normalized : 'course';
  const suffix = courseId.split('-')[0] ?? courseId;
  return `${fallback}-${suffix}`;
}

function normalizeGeneratedText(text: string) {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)?.[1];
  return (fenced ?? trimmed).trim();
}

function extractGeminiText(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = (first?.content ?? {}) as Record<string, unknown>;
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const firstPart = parts[0] as Record<string, unknown> | undefined;
  return typeof firstPart?.text === 'string' ? firstPart.text : '';
}

function buildQuizPrompt(documents: TutorDocumentRecord[], questionCount: number) {
  const materials = documents
    .map((document, index) => `[文件${index + 1}: ${document.filename}]\n${document.extracted_text}`)
    .join('\n\n');

  return `你是一位考试辅导老师，根据以下学习材料生成考前复习测验。
测验目标：帮助学生识别薄弱点，通过每题的解析加深对知识点的理解。

语言规则：所有输出（题目、选项、解析、标题）必须与学习材料的主要语言一致，
不得混用。

## 学习材料
${materials}

## 出题要求

题目数量：${questionCount} 题
难度等级：intermediate
  - beginner：基础概念与定义，直接从材料中找答案
  - intermediate：理解与应用，需要理解概念后作判断
  - advanced：分析与综合，需要跨概念推理

出题原则：
- 优先覆盖材料中最核心、考试最常考的知识点
- 避免出现可以不看材料就能猜到答案的题目
- 题目由易到难排列

题型比例（必须混合使用，禁止全部用同一种）：
- mc（单选）：约 40%，有且仅有一个正确答案
- mc_multi（多选）：约 20%，q 字段必须注明"多选"或"Select all that apply"，至少 2 个正确答案
- tf（判断）：约 20%
- match（匹配）：约 20%，每题 4-6 个配对

## 解析字段（exp）规范
适用题型：mc、mc_multi、tf（match 不需要 exp）

每条 exp 必须同时覆盖两种场景：
1. 答错时 → 解释最常见的错误原因，指出错在哪个认知环节
2. 答对时 → 补充这个知识点在整体知识体系中的位置或与相关概念的联系

写作要求：
- 2-4 句话，不超过 100 字
- 必须引用材料中的具体概念或表述
- 语气像老师课后答疑，简洁有深度
- 严禁写"答案是X"或"正确选项是X"这类无意义内容

## 输出格式
只输出 JSON，直接从 { 开始，不要任何 markdown 包裹，不要任何解释文字：

{
  "title": "根据材料内容起一个准确的测验标题",
  "description": "一句话说明本测验覆盖哪些主题",
  "difficulty": "intermediate",
  "questions": [
    {
      "type": "mc",
      "q": "题目文字",
      "opts": ["选项A", "正确答案B*", "选项C", "选项D"],
      "exp": "解析文字"
    },
    {
      "type": "mc_multi",
      "q": "题目文字（多选）",
      "opts": ["正确答案A*", "正确答案B*", "错误选项C", "错误选项D"],
      "exp": "解析文字"
    },
    {
      "type": "tf",
      "stmt": "判断题陈述句",
      "ans": true,
      "exp": "解析文字"
    },
    {
      "type": "match",
      "pairs": [
        ["左侧项1", "右侧项1"],
        ["左侧项2", "右侧项2"],
        ["左侧项3", "右侧项3"],
        ["左侧项4", "右侧项4"]
      ]
    }
  ]
}

注意：opts 中正确答案在文字末尾加 * 号标记，match 题无需标记。`;
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
    const text = normalizeGeneratedText(extractGeminiText(payload));
    if (!text) {
      lastError = 'Gemini returned an empty response.';
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
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
    const documentIds = Array.isArray(payload?.documentIds)
      ? payload.documentIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const dedupedDocumentIds = [...new Set(documentIds)];
    const questionCount = Number(payload?.questionCount ?? 10);

    if (!dedupedDocumentIds.length) {
      return new Response(JSON.stringify({ error: 'Please select at least one document.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Number.isInteger(questionCount) || questionCount < 5 || questionCount > 50) {
      return new Response(JSON.stringify({ error: 'questionCount must be an integer between 5 and 50.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: documents, error: documentsError } = await client
      .from('tutor_documents')
      .select('id, filename, extracted_text')
      .in('id', dedupedDocumentIds);

    if (documentsError) {
      throw documentsError;
    }

    const documentRows = (documents ?? []) as TutorDocumentRecord[];
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

    const dsl = await generateQuizDsl(buildQuizPrompt(orderedDocuments, questionCount), questionCount);
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
