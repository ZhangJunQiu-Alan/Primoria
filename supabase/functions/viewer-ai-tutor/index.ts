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

type TutorPersona = 'gentle' | 'socratic' | 'coach';

type TutorContext = {
  surface?: string;
  lessonTitle?: string;
  pageIndex?: number;
  pageCount?: number;
  pageTitle?: string;
  pageContent?: string;
  learnerState?: string;
};

function normalizePersona(value: unknown): TutorPersona {
  return value === 'socratic' || value === 'coach' || value === 'gentle' ? value : 'gentle';
}

function personaDirective(persona: TutorPersona) {
  switch (persona) {
    case 'socratic':
      return [
        'Adopt a Socratic tutoring style.',
        'When helpful, begin with one concise question that helps the learner think.',
        'Then provide a short explanation and a clear next step.',
      ].join(' ');
    case 'coach':
      return [
        'Adopt a direct coaching style.',
        'Be concise, outcome-oriented, and explicit about the next action.',
        'Prefer momentum and clarity over long exposition.',
      ].join(' ');
    default:
      return [
        'Adopt a gentle tutoring style.',
        'Lower pressure, break the problem into smaller steps, and keep the tone calm and supportive.',
      ].join(' ');
  }
}

function buildContextPrompt(context: TutorContext | null) {
  if (!context) {
    return '';
  }

  const lines = [
    'Runtime context:',
    context.surface ? `Surface: ${context.surface}` : '',
    context.lessonTitle ? `Lesson: ${context.lessonTitle}` : '',
    typeof context.pageIndex === 'number' && typeof context.pageCount === 'number'
      ? `Page: ${context.pageIndex} of ${context.pageCount}`
      : '',
    context.pageTitle ? `Page title: ${context.pageTitle}` : '',
    context.pageContent ? `Visible page content:\n${context.pageContent}` : '',
    context.learnerState ? `Learner state:\n${context.learnerState}` : '',
    'Prioritize the visible page content and learner state above.',
    'You may add brief, stable background knowledge when the learner asks about a term or concept that the current page references but does not define.',
    'When you add background knowledge, clearly distinguish it from what is explicitly shown on the page.',
    'Do not reveal or infer hidden future questions, hidden explanations, or correct answers that are not already shown on screen.',
    'If the current page does not provide enough evidence for a page-specific claim, say that clearly before adding any helpful background context.',
  ]
    .filter(Boolean)
    .join('\n\n');

  return lines;
}

function buildPrompt(mode: string, history: TutorHistoryMessage[], persona: TutorPersona, context: TutorContext | null) {
  const transcript = history
    .map((message) => `${message.role === 'user' ? 'User' : 'Tutor'}: ${message.text}`)
    .join('\n');
  const contextPrompt = buildContextPrompt(context);

  switch (mode) {
    case 'mindmap':
      return [
        'Create a concise learner mind map from the conversation.',
        'Return JSON only with the shape {"title":"...","nodes":[{"id":"...","label":"..."}]}.',
        contextPrompt,
        transcript,
      ].join('\n\n');
    case 'quiz':
      return [
        'Create a short learner quiz from the conversation.',
        'Return JSON only with the shape {"title":"...","questions":[{"prompt":"...","options":["..."],"answerIndex":0}]}.',
        contextPrompt,
        transcript,
      ].join('\n\n');
    case 'presentation':
      return [
        'Create a concise slide outline from the conversation.',
        'Return JSON only with the shape {"title":"...","slides":[{"title":"...","bullet":"..."}]}.',
        contextPrompt,
        transcript,
      ].join('\n\n');
    default:
      return [
        'Respond as Primoria AI Tutor.',
        personaDirective(persona),
        'Keep the answer concise and actionable.',
        'Return JSON only with the shape {"reply":"..."}',
        contextPrompt,
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
    const { mode, model, history, apiKeyOverride, persona, context, allowModelFallback } = await req.json();
    const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : 'reply';
    const normalizedPersona = normalizePersona(persona);
    const normalizedHistory = Array.isArray(history)
      ? history
          .map((entry) => ({
            role: entry?.role === 'user' ? 'user' : 'model',
            text: typeof entry?.text === 'string' ? entry.text.trim() : '',
          }))
          .filter((entry) => entry.text.length > 0)
      : [];

    const normalizedContext =
      context && typeof context === 'object'
        ? {
            surface: typeof context.surface === 'string' ? context.surface.trim() : undefined,
            lessonTitle: typeof context.lessonTitle === 'string' ? context.lessonTitle.trim() : undefined,
            pageIndex: typeof context.pageIndex === 'number' ? context.pageIndex : undefined,
            pageCount: typeof context.pageCount === 'number' ? context.pageCount : undefined,
            pageTitle: typeof context.pageTitle === 'string' ? context.pageTitle.trim() : undefined,
            pageContent: typeof context.pageContent === 'string' ? context.pageContent.trim() : undefined,
            learnerState: typeof context.learnerState === 'string' ? context.learnerState.trim() : undefined,
          }
        : null;

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

    const requestedModel = typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODEL;
    const candidateModels =
      allowModelFallback === false
        ? [requestedModel]
        : [requestedModel, ...FALLBACK_MODELS.filter((candidate) => candidate !== requestedModel)];
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
                  text: 'You are Primoria AI Tutor. Reply concisely, stay grounded in the provided context, and return valid JSON only.',
                },
              ],
            },
            contents: [{ role: 'user', parts: [{ text: buildPrompt(normalizedMode, normalizedHistory, normalizedPersona, normalizedContext) }] }],
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
