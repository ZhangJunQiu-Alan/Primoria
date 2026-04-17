import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { z } from 'npm:zod@3.25.76';
import { extractNormalizedGeminiCandidateTexts } from '../_shared/geminiResponse.ts';
import {
  buildMindMapPrompt,
  normalizeTitle,
  sanitizeMindMapTree,
  toPersistedDocument,
  type TutorDocumentRecord,
  type RawMindMapNode,
} from './mindmapHelpers.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_OUTPUT_TOKENS = 4096;
const MAX_COMBINED_TEXT_LENGTH = 70_000;
const DOCUMENT_SELECT_FIELDS = 'id, filename, display_title, extracted_text';
const LEGACY_DOCUMENT_SELECT_FIELDS = 'id, filename, extracted_text';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

async function fetchTutorDocumentsForMindMap(
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
    const documentIds: string[] = Array.isArray(payload?.documentIds)
      ? payload.documentIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const dedupedDocumentIds: string[] = [...new Set(documentIds)];
    const userPrompt = typeof payload?.prompt === 'string' ? payload.prompt.trim() : '';

    if (!dedupedDocumentIds.length) {
      return new Response(JSON.stringify({ error: 'Please select at least one document.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const documentRows = await fetchTutorDocumentsForMindMap(client, dedupedDocumentIds);
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
    const persistedDocument = toPersistedDocument(generated.root);
    const { data: mindMapRow, error: insertError } = await client
      .from('ai_tutor_mindmaps')
      .insert({
        user_id: authData.user.id,
        title: generated.title,
        source_document_ids: dedupedDocumentIds,
        user_prompt: userPrompt,
        document: persistedDocument,
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({
      title: generated.title,
      mindMapId: mindMapRow?.id,
      root: generated.root,
    }), {
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
