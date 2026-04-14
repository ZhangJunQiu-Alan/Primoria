import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { z } from 'npm:zod@3.25.76';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_OUTPUT_TOKENS = 4096;
const MAX_COMBINED_TEXT_LENGTH = 60_000;
const MAX_TITLE_LENGTH = 80;
const MAX_LABEL_LENGTH = 72;
const MAX_TOTAL_NODES = 40;
const MAX_CHILDREN_PER_NODE = 6;
const MAX_DEPTH = 4;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TutorDocumentRecord = {
  id: string;
  filename: string;
  extracted_text: string;
};

type RawMindMapNode = {
  label: string;
  children?: RawMindMapNode[];
};

type MindMapNode = {
  id: string;
  label: string;
  children?: MindMapNode[];
};

const RawMindMapNodeSchema: z.ZodType<RawMindMapNode> = z.object({
  label: z.string().min(1),
  children: z.array(z.lazy(() => RawMindMapNodeSchema)).optional(),
});

const MindMapResponseSchema = z.object({
  title: z.string().min(1),
  root: RawMindMapNodeSchema,
});

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

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LENGTH);
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
}

function buildMindMapPrompt(documents: TutorDocumentRecord[], userPrompt: string) {
  const materials = documents
    .map((document, index) => `[文件${index + 1}: ${document.filename}]\n${document.extracted_text}`)
    .join('\n\n');

  const promptSections = [
    '你是一位学习教练，请根据以下学习资料生成一张适合复习的思维导图。',
    '目标：帮助学习者快速看清知识主干、关键分支和概念之间的连接。',
    '',
    '语言规则：',
    '- 输出语言必须与资料主语言一致',
    '- 不要混用语言',
    '',
    '结构规则：',
    '- 必须输出单根树形结构，不要输出平铺列表',
    '- 根节点概括整份资料主题',
    '- 总层级控制在 2 到 4 层',
    `- 总节点数不要超过 ${MAX_TOTAL_NODES} 个`,
    `- 每个节点最多 ${MAX_CHILDREN_PER_NODE} 个直接子节点`,
    '- 节点标签使用短语，不写完整长句',
    '- 避免“介绍”“内容”“其他”这类空泛标签',
    '',
    '内容规则：',
    '- 只使用资料中明确出现或可直接归纳出的概念',
    '- 不要补充没有来源的新知识',
    '- 适当体现并列关系、因果关系、组成关系或步骤关系',
    '- 如果资料跨度较大，优先围绕核心考试或复习重点组织结构',
    '',
    '输出格式：',
    '只返回 JSON，从 { 开始，不要 markdown，不要解释文字。',
    '',
    '{',
    '  "title": "简洁准确的导图标题",',
    '  "root": {',
    '    "label": "根节点",',
    '    "children": [',
    '      {',
    '        "label": "一级分支",',
    '        "children": [',
    '          { "label": "二级分支" }',
    '        ]',
    '      }',
    '    ]',
    '  }',
    '}',
    '',
    '## 学习资料',
    materials,
  ];

  if (userPrompt.trim()) {
    promptSections.push('', '## 用户追加要求', userPrompt.trim(), '', '注意：用户追加要求只能作为补充约束，不能改变 JSON 结构要求。');
  }

  return promptSections.join('\n');
}

function sanitizeMindMapTree(root: RawMindMapNode) {
  const state = { count: 0 };

  function visit(node: RawMindMapNode, depth: number): MindMapNode | null {
    if (state.count >= MAX_TOTAL_NODES) {
      return null;
    }

    const label = normalizeLabel(node.label);
    if (!label) {
      return null;
    }

    state.count += 1;
    const sanitized: MindMapNode = {
      id: `node-${crypto.randomUUID()}`,
      label,
    };

    if (depth >= MAX_DEPTH) {
      return sanitized;
    }

    const children: MindMapNode[] = [];
    for (const child of (node.children ?? []).slice(0, MAX_CHILDREN_PER_NODE)) {
      const nextChild = visit(child, depth + 1);
      if (nextChild) {
        children.push(nextChild);
      }
      if (state.count >= MAX_TOTAL_NODES) {
        break;
      }
    }

    if (children.length) {
      sanitized.children = children;
    }

    return sanitized;
  }

  const sanitizedRoot = visit(root, 0);
  if (!sanitizedRoot) {
    throw new Error('Mind map root could not be normalized.');
  }

  return sanitizedRoot;
}

async function generateMindMap(prompt: string) {
  const geminiApiKey = getEnv('GEMINI_API_KEY');
  let lastError = 'AI mind map generation failed.';

  for (const model of [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((candidate) => candidate !== DEFAULT_MODEL)]) {
    const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'You generate grounded learning mind maps. Return valid JSON only.' }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
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

    let mindMap: z.infer<typeof MindMapResponseSchema>;
    try {
      mindMap = MindMapResponseSchema.parse(parsed);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Mind map schema validation failed.';
      continue;
    }

    const title = normalizeTitle(mindMap.title);
    if (!title) {
      lastError = 'Mind map title is empty.';
      continue;
    }

    return {
      title,
      root: sanitizeMindMapTree(mindMap.root),
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
    const userPrompt = typeof payload?.prompt === 'string' ? payload.prompt.trim() : '';

    if (!dedupedDocumentIds.length) {
      return new Response(JSON.stringify({ error: 'Please select at least one document.' }), {
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

    const generated = await generateMindMap(buildMindMapPrompt(orderedDocuments, userPrompt));
    return new Response(JSON.stringify(generated), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[viewer-ai-mindmap-from-docs] unexpected error', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
