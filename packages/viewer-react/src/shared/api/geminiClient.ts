import { supabase } from '@/shared/api/supabase';
import { usesViewerFixtures } from '@/shared/api/viewer/core';

const GEMINI_STORAGE_KEY = 'primoria.viewer.gemini-api-key';
const TUTOR_THREAD_STORAGE_KEY = 'primoria.viewer.ai-tutor-thread-id';
const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
const rawAgentServiceUrl = (import.meta.env.VITE_AGENT_SERVICE_URL as string | undefined)?.trim() ?? '';
const TUTOR_TIMEOUT_MS = 30_000;

export type TutorMessage = {
  role: 'user' | 'model';
  text: string;
};

export type TutorReplyStreamResult = {
  threadId: string;
  reply: string;
  usedTools: string[];
};

export type TutorReplyStreamHandlers = {
  onRunStarted?: (payload: { threadId: string }) => void;
  onToken?: (token: string) => void;
  onFinal?: (payload: TutorReplyStreamResult) => void;
  onError?: (error: Error) => void;
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

function agentServiceChatUrl() {
  if (!rawAgentServiceUrl) {
    return '';
  }
  return `${rawAgentServiceUrl.replace(/\/$/, '')}/v1/chat`;
}

function agentServiceChatStreamUrl() {
  if (!rawAgentServiceUrl) {
    return '';
  }
  return `${rawAgentServiceUrl.replace(/\/$/, '')}/v1/chat/stream`;
}

function getTutorThreadId() {
  if (typeof window === 'undefined') {
    return 'viewer:server:ephemeral';
  }
  const existing = window.localStorage.getItem(TUTOR_THREAD_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const created = `viewer:web:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  window.localStorage.setItem(TUTOR_THREAD_STORAGE_KEY, created);
  return created;
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(new Error('AI Tutor request timed out.')), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => globalThis.clearTimeout(timeoutId),
  };
}

async function getAgentAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('AI Tutor agent requires a signed-in learner session.');
  }
  return accessToken;
}

function buildAgentChatBody(history: TutorMessage[]) {
  const latestUserMessage = [...history].reverse().find((message) => message.role === 'user')?.text.trim() ?? '';
  if (!latestUserMessage) {
    throw new Error('AI Tutor requires a learner message.');
  }

  return {
    thread_id: getTutorThreadId(),
    message: latestUserMessage,
    history: history.slice(0, -1),
    context: {
      surface: 'ai-tutor',
    },
  };
}

async function requestAgentReply(history: TutorMessage[]) {
  const chatUrl = agentServiceChatUrl();
  if (!chatUrl) {
    return null;
  }

  const accessToken = await getAgentAccessToken();
  const timeout = createTimeoutSignal(TUTOR_TIMEOUT_MS);
  const response = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(buildAgentChatBody(history)),
    signal: timeout.signal,
  }).finally(() => {
    timeout.cleanup();
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { reply?: string; detail?: string }) : {};
  if (!response.ok) {
    throw new Error(payload.detail || `AI Tutor agent failed with HTTP ${response.status}.`);
  }
  if (!payload.reply?.trim()) {
    throw new Error('AI Tutor agent returned an empty response.');
  }
  return payload.reply.trim();
}

function parseSseEvent(block: string) {
  const lines = block
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  let event = 'message';
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }

  return {
    event,
    data: dataLines.join('\n'),
  };
}

async function requestAgentReplyStream(history: TutorMessage[], handlers: TutorReplyStreamHandlers = {}) {
  const streamUrl = agentServiceChatStreamUrl();
  if (!streamUrl) {
    return null;
  }

  const accessToken = await getAgentAccessToken();
  const timeout = createTimeoutSignal(TUTOR_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(buildAgentChatBody(history)),
      signal: timeout.signal,
    });
  } catch (error) {
    timeout.cleanup();
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    timeout.cleanup();
    let detail = `AI Tutor agent failed with HTTP ${response.status}.`;
    if (text) {
      try {
        const payload = JSON.parse(text) as { detail?: string };
        detail = payload.detail || detail;
      } catch {
        detail = text;
      }
    }
    throw new Error(detail);
  }

  if (!response.body) {
    timeout.cleanup();
    const reply = await requestAgentReply(history);
    if (!reply) {
      throw new Error('AI Tutor agent did not return a stream.');
    }
    const payload = { threadId: getTutorThreadId(), reply, usedTools: [] };
    handlers.onToken?.(reply);
    handlers.onFinal?.(payload);
    return payload;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';
  let finalPayload: TutorReplyStreamResult | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        const parsed = parseSseEvent(rawEvent);
        if (!parsed?.data) {
          continue;
        }

        const payload = JSON.parse(parsed.data) as {
          detail?: string;
          reply?: string;
          text?: string;
          thread_id?: string;
          used_tools?: string[];
        };

        if (parsed.event === 'run_started' && payload.thread_id) {
          handlers.onRunStarted?.({ threadId: payload.thread_id });
          continue;
        }

        if (parsed.event === 'token' && payload.text) {
          reply += payload.text;
          handlers.onToken?.(payload.text);
          continue;
        }

        if (parsed.event === 'final') {
          finalPayload = {
            threadId: payload.thread_id || getTutorThreadId(),
            reply: payload.reply?.trim() || reply.trim(),
            usedTools: payload.used_tools ?? [],
          };
          handlers.onFinal?.(finalPayload);
          continue;
        }

        if (parsed.event === 'error') {
          throw new Error(payload.detail || 'AI Tutor agent stream failed.');
        }
      }
    }
  } finally {
    timeout.cleanup();
    reader.releaseLock();
  }

  if (!finalPayload) {
    finalPayload = {
      threadId: getTutorThreadId(),
      reply: reply.trim(),
      usedTools: [],
    };
    if (!finalPayload.reply) {
      throw new Error('AI Tutor agent stream ended without a reply.');
    }
    handlers.onFinal?.(finalPayload);
  }

  return finalPayload;
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

  if (mode === 'reply') {
    const agentReply = await requestAgentReply(history);
    if (agentReply) {
      return { reply: agentReply } as T;
    }
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

export async function generateTutorReplyStream(history: TutorMessage[], handlers: TutorReplyStreamHandlers = {}) {
  if (usesViewerFixtures()) {
    const reply = fixtureReply(history);
    const payload = { threadId: getTutorThreadId(), reply, usedTools: [] };
    handlers.onToken?.(reply);
    handlers.onFinal?.(payload);
    return payload;
  }

  try {
    const streamed = await requestAgentReplyStream(history, handlers);
    if (streamed) {
      return streamed;
    }
  } catch (error) {
    if (handlers.onError && error instanceof Error) {
      handlers.onError(error);
    }
    throw error;
  }

  const reply = await generateTutorReply(history);
  const payload = { threadId: getTutorThreadId(), reply, usedTools: [] };
  handlers.onToken?.(reply);
  handlers.onFinal?.(payload);
  return payload;
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
