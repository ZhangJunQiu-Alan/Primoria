import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { z } from 'npm:zod@3.25.76';
import { extractNormalizedGeminiCandidateTexts } from '../_shared/geminiResponse.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_OUTPUT_TOKENS = 16_384;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  prompt: z.string().min(8),
  template: z.string().optional(),
  experienceMode: z.enum(['simulation', 'graph', 'scenario', 'story']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  language: z.enum(['en', 'zh-CN']).optional(),
  surface: z.enum(['builder', 'ai-tutor']).optional(),
});

const ResponseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  template: z.string().min(1),
  experienceMode: z.enum(['simulation', 'graph', 'scenario', 'story']).optional(),
  generatedHtml: z.string().min(1),
  themeTone: z.string().optional(),
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

function validateOfflineHtml(html: string) {
  if (/<script[^>]+src\s*=/i.test(html)) {
    throw new Error('Interactive visuals must use inline JavaScript only.');
  }
  if (/<(iframe|embed|object)\b/i.test(html)) {
    throw new Error('Interactive visuals cannot embed external frames.');
  }
  if (/\bhttps?:\/\//i.test(html)) {
    throw new Error('Interactive visuals must be fully offline and cannot reference external URLs.');
  }
  if (/\bfetch\s*\(/i.test(html) || /\bXMLHttpRequest\b/i.test(html) || /\bWebSocket\b/i.test(html)) {
    throw new Error('Interactive visuals must not make network requests.');
  }
}

function buildInteractiveVisualPrompt(payload: z.infer<typeof RequestSchema>) {
  const languageInstruction =
    payload.language === 'zh-CN'
      ? 'Write learner-facing labels and explanatory text in Simplified Chinese.'
      : 'Write learner-facing labels and explanatory text in English.';

  const templateHint = payload.template?.trim() && payload.template !== 'generic'
    ? `Prefer this starting simulation family when it fits: ${payload.template}.`
    : 'Choose the most appropriate interactive simulation family yourself.';

  const modeHint = payload.experienceMode
    ? `The author explicitly wants this interaction mode: ${payload.experienceMode}. Honour it unless it is impossible for the request.`
    : 'Infer the best interaction mode from the request: simulation, graph, scenario, or story.';

  return `
You are an expert educational simulation designer and front-end developer.
Reason silently step-by-step, but do not reveal your chain of thought.
Return valid JSON only with this exact shape:
{
  "title": "string",
  "description": "string",
  "template": "string",
  "experienceMode": "simulation | graph | scenario | story",
  "themeTone": "string",
  "generatedHtml": "string"
}

The generatedHtml value must be a self-contained HTML fragment, not a full document.
It must include inline <style> and inline <script> only.
Do not use:
- external URLs
- script src
- fetch / XMLHttpRequest / WebSocket
- iframe / object / embed
- module imports

Make the output:
- educationally accurate
- animated or highly interactive
- appropriate for a learner to manipulate
- responsive
- visually polished
- fully offline

Include at least:
- a clear heading
- a short learning objective
- 2 to 5 controls (sliders, toggles, buttons, etc.) when the concept benefits from them
- a live visual area (canvas or SVG preferred)
- an incremental feedback mechanism or explanatory note
- calls to window.PrimoriaInteractive.track(eventName, payload) for meaningful learner interactions
  such as button presses, step reveals, mode switches, or answer checks when you add custom handlers

If the topic is mathematical, ensure the graph is labeled clearly.
If the topic is physical, keep the model qualitatively accurate.

${languageInstruction}
${templateHint}
${modeHint}

Author context:
- Surface: ${payload.surface ?? 'builder'}
- Suggested title: ${payload.title?.trim() || 'none'}
- Suggested description: ${payload.description?.trim() || 'none'}

Learner request:
${payload.prompt.trim()}
`.trim();
}

async function generateInteractiveVisual(payload: z.infer<typeof RequestSchema>) {
  const geminiApiKey = getEnv('GEMINI_API_KEY');
  let lastError = 'AI interactive visual generation failed.';

  for (const model of [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((candidate) => candidate !== DEFAULT_MODEL)]) {
    const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'You create safe, offline, interactive educational HTML5 experiences. Return JSON only.' }],
        },
        contents: [{ role: 'user', parts: [{ text: buildInteractiveVisualPrompt(payload) }] }],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      lastError = `Gemini returned HTTP ${response.status}.`;
      continue;
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const candidateTexts = extractNormalizedGeminiCandidateTexts(raw);
    if (!candidateTexts.length) {
      lastError = 'Gemini returned an empty response.';
      continue;
    }

    let parsed: unknown = null;
    for (const text of candidateTexts) {
      try {
        parsed = JSON.parse(text);
        break;
      } catch {
        continue;
      }
    }

    if (!parsed) {
      lastError = 'Gemini returned invalid JSON.';
      continue;
    }

    try {
      const generated = ResponseSchema.parse(parsed);
      validateOfflineHtml(generated.generatedHtml);
      return generated;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Interactive visual schema validation failed.';
      continue;
    }
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

    const payload = RequestSchema.parse(await req.json());
    const generated = await generateInteractiveVisual(payload);

    return new Response(
      JSON.stringify({
        version: '1',
        engine: 'gemini-html5',
        title: generated.title,
        description: generated.description,
        template: generated.template,
        experienceMode: generated.experienceMode ?? payload.experienceMode ?? undefined,
        themeTone: generated.themeTone,
        aiPrompt: payload.prompt,
        generatedHtml: generated.generatedHtml,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Interactive visual generation failed.',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
