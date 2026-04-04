import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TutorHistoryMessage = {
  role: 'user' | 'model';
  text: string;
};

function buildPrompt(mode: string, history: TutorHistoryMessage[]) {
  const transcript = history
    .map((message) => `${message.role === 'user' ? 'User' : 'Tutor'}: ${message.text}`)
    .join('\n');

  switch (mode) {
    case 'mindmap':
      return [
        'Create a concise learner mind map from the conversation.',
        'Return JSON only with the shape {"title":"...","nodes":[{"id":"...","label":"..."}]}.',
        transcript,
      ].join('\n\n');
    case 'quiz':
      return [
        'Create a short learner quiz from the conversation.',
        'Return JSON only with the shape {"title":"...","questions":[{"prompt":"...","options":["..."],"answerIndex":0}]}.',
        transcript,
      ].join('\n\n');
    case 'presentation':
      return [
        'Create a concise slide outline from the conversation.',
        'Return JSON only with the shape {"title":"...","slides":[{"title":"...","bullet":"..."}]}.',
        transcript,
      ].join('\n\n');
    default:
      return [
        'Respond as Primoria AI Tutor.',
        'Keep the answer concise and actionable.',
        'Return JSON only with the shape {"reply":"..."}',
        transcript,
      ].join('\n\n');
  }
}

function extractText(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = (first?.content ?? {}) as Record<string, unknown>;
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const firstPart = parts[0] as Record<string, unknown> | undefined;
  return typeof firstPart?.text === 'string' ? firstPart.text.trim() : '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mode, model, history, apiKeyOverride } = await req.json();
    const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : 'reply';
    const normalizedHistory = Array.isArray(history)
      ? history
          .map((entry) => ({
            role: entry?.role === 'user' ? 'user' : 'model',
            text: typeof entry?.text === 'string' ? entry.text.trim() : '',
          }))
          .filter((entry) => entry.text.length > 0)
      : [];

    if (normalizedHistory.length === 0) {
      return new Response(
        JSON.stringify({ error: 'history is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey =
      (typeof apiKeyOverride === 'string' && apiKeyOverride.trim()) ||
      Deno.env.get('GEMINI_API_KEY') ||
      '';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini is not configured yet. Set GEMINI_API_KEY or provide /apikey.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const candidateModels = [
      typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODEL,
      ...FALLBACK_MODELS.filter((candidate) => candidate !== model),
    ];
    let lastError = 'AI Tutor request failed.';

    for (const candidateModel of candidateModels) {
      const response = await fetch(
        `${GEMINI_BASE_URL}/models/${candidateModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: 'You are Primoria AI Tutor. Reply concisely and return valid JSON only.',
                },
              ],
            },
            contents: [{ role: 'user', parts: [{ text: buildPrompt(normalizedMode, normalizedHistory) }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 1024,
            },
          }),
        },
      );

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const text = extractText(payload);
      if (!text) {
        lastError = 'AI Tutor returned an empty response.';
        continue;
      }

      const normalized = /```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1] ?? text;
      return new Response(
        normalized,
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: lastError }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
