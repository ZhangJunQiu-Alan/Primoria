import { usesViewerFixtures } from '@/shared/api/viewer/core';

const GEMINI_STORAGE_KEY = 'primoria.viewer.gemini-api-key';
const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
const TUTOR_TIMEOUT_MS = 30_000;

export type TutorMessage = {
  role: 'user' | 'model';
  text: string;
};

function activeModel() {
  return (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || 'gemini-2.0-flash';
}

export function getStoredGeminiKey() {
  if (typeof window === 'undefined') {
    return '';
  }

  return (
    ((import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() ??
      window.localStorage.getItem(GEMINI_STORAGE_KEY) ??
      '') || ''
  );
}

export async function persistGeminiKey(key: string) {
  const normalized = key.trim();
  if (!normalized || typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(GEMINI_STORAGE_KEY, normalized);
}

export async function bootstrapGeminiKey() {
  return getStoredGeminiKey();
}

function fixtureReply(history: TutorMessage[]) {
  const lastUserMessage = [...history].reverse().find((message) => message.role === 'user')?.text ?? 'your notes';
  return `Fixture tutor reply: focus the next step on ${lastUserMessage.toLowerCase()}.`;
}

function tutorFunctionUrl() {
  if (!rawSupabaseUrl) {
    throw new Error('AI Tutor requires VITE_SUPABASE_URL.');
  }

  if (rawSupabaseUrl.includes('.supabase.co')) {
    return `${rawSupabaseUrl.replace('.supabase.co', '.functions.supabase.co')}/viewer-ai-tutor`;
  }

  return `${rawSupabaseUrl.replace(/\/$/, '')}/functions/v1/viewer-ai-tutor`;
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(new Error('AI Tutor request timed out.')), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => globalThis.clearTimeout(timeoutId),
  };
}

async function requestTutorTool<T>(mode: 'reply' | 'mindmap' | 'quiz' | 'presentation', history: TutorMessage[]) {
  if (usesViewerFixtures()) {
    if (mode === 'reply') {
      return { reply: fixtureReply(history) } as T;
    }
    if (mode === 'mindmap') {
      return {
        title: 'Fixture mind map',
        nodes: history.slice(-3).map((message, index) => ({
          id: `node-${index + 1}`,
          label: message.text.slice(0, 40) || `Idea ${index + 1}`,
        })),
      } as T;
    }
    if (mode === 'quiz') {
      return {
        title: 'Fixture quiz',
        questions: [
          {
            prompt: 'What is the main learner workflow?',
            options: ['Library -> Course -> Lesson -> Result', 'Builder -> Publish -> Edit'],
            answerIndex: 0,
          },
        ],
      } as T;
    }
    return {
      title: 'Fixture presentation',
      slides: [
        { title: 'Summary', bullet: 'Use the React viewer as the learner runtime.' },
        { title: 'Next step', bullet: 'Keep testing the critical paths before cutover.' },
      ],
    } as T;
  }

  const apiKeyOverride = getStoredGeminiKey();
  if (!rawSupabaseAnonKey) {
    throw new Error('AI Tutor requires VITE_SUPABASE_ANON_KEY.');
  }

  const timeout = createTimeoutSignal(TUTOR_TIMEOUT_MS);
  const response = await fetch(tutorFunctionUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: rawSupabaseAnonKey,
      Authorization: `Bearer ${rawSupabaseAnonKey}`,
    },
    body: JSON.stringify({
      mode,
      model: activeModel(),
      history,
      apiKeyOverride: apiKeyOverride || undefined,
    }),
    signal: timeout.signal,
  }).finally(() => {
    timeout.cleanup();
  });

  const text = await response.text();
  let parsed: T | { error?: string } | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as T | { error?: string };
    } catch {
      throw new Error(response.ok ? 'AI Tutor returned invalid JSON.' : text);
    }
  }
  if (!response.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
        ? parsed.error
        : `AI Tutor request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI Tutor returned an empty response.');
  }
  return parsed as T;
}

export async function generateTutorReply(history: TutorMessage[]) {
  const response = await requestTutorTool<{ reply: string }>('reply', history);
  return response.reply;
}

export async function generateMindMap(history: TutorMessage[]) {
  return requestTutorTool<{ title: string; nodes: Array<{ id: string; label: string }> }>('mindmap', history);
}

export async function generateQuiz(history: TutorMessage[]) {
  return requestTutorTool<{
    title: string;
    questions: Array<{
      prompt: string;
      options: string[];
      answerIndex: number;
    }>;
  }>('quiz', history);
}

export async function generatePresentation(history: TutorMessage[]) {
  return requestTutorTool<{
    title: string;
    slides: Array<{ title: string; bullet: string }>;
  }>('presentation', history);
}
