import { normalizeAiTutorPersona } from '@/shared/ai-tutor/persona';
import { fetchAgentJson, getAgentAccessToken, agentServiceUrl } from '@/shared/api/agentService';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { normalizeViewerLanguage } from '@/shared/i18n/locale';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';

const TUTOR_THREAD_STORAGE_KEY = 'primoria.viewer.ai-tutor-thread-id';
const TUTOR_TIMEOUT_MS = 30_000;

export type TutorMessage = {
  role: 'user' | 'model';
  text: string;
};

export type TutorRequestContext = {
  surface?: string;
  courseId?: string | null;
  lessonId?: string | null;
  blockId?: string | null;
  locale?: string | null;
  uiLanguage?: string | null;
  aiTutorPersona?: string | null;
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

type TutorToolContextBody = {
  surface: string;
  course_id?: string;
  lesson_id?: string;
  block_id?: string;
  locale?: string;
  ui_language?: string;
  ai_tutor_persona?: string;
};

type CreatedThreadPayload = {
  thread: {
    id: string;
  };
};

function fixtureReply(history: TutorMessage[]) {
  const lastUserMessage = [...history].reverse().find((message) => message.role === 'user')?.text ?? 'your notes';
  return `Fixture tutor reply: focus the next step on ${lastUserMessage.toLowerCase()}.`;
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(new Error('AI Tutor request timed out.')), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => globalThis.clearTimeout(timeoutId),
  };
}

function currentUiLanguage() {
  if (typeof document === 'undefined') {
    return normalizeViewerLanguage(null);
  }

  return normalizeViewerLanguage(document.documentElement.lang);
}

function currentAiTutorPersona() {
  if (typeof window === 'undefined') {
    return normalizeAiTutorPersona(null);
  }

  try {
    const raw = window.localStorage.getItem(VIEWER_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return normalizeAiTutorPersona(null);
    }
    const parsed = JSON.parse(raw) as { aiTutorPersona?: unknown };
    return normalizeAiTutorPersona(parsed.aiTutorPersona);
  } catch {
    return normalizeAiTutorPersona(null);
  }
}

function getStoredTutorThreadId() {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(TUTOR_THREAD_STORAGE_KEY) ?? '';
}

function persistTutorThreadId(threadId: string) {
  if (!threadId || typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TUTOR_THREAD_STORAGE_KEY, threadId);
}

function buildTutorContext(context?: TutorRequestContext): TutorToolContextBody {
  const resolvedUiLanguage = context?.uiLanguage?.trim() || currentUiLanguage();
  const resolvedLocale = context?.locale?.trim() || resolvedUiLanguage;
  const resolvedPersona = context?.aiTutorPersona?.trim() || currentAiTutorPersona();

  return {
    surface: context?.surface?.trim() || 'ai-tutor',
    ...(context?.courseId?.trim() ? { course_id: context.courseId.trim() } : {}),
    ...(context?.lessonId?.trim() ? { lesson_id: context.lessonId.trim() } : {}),
    ...(context?.blockId?.trim() ? { block_id: context.blockId.trim() } : {}),
    ...(resolvedLocale ? { locale: resolvedLocale } : {}),
    ...(resolvedUiLanguage ? { ui_language: resolvedUiLanguage } : {}),
    ...(resolvedPersona ? { ai_tutor_persona: resolvedPersona } : {}),
  };
}

async function ensureTutorThreadId(context?: TutorRequestContext) {
  const existing = getStoredTutorThreadId();
  if (existing) {
    return existing;
  }

  const payload = await fetchAgentJson<CreatedThreadPayload>('/v1/threads', {
    method: 'POST',
    body: JSON.stringify({
      context: buildTutorContext(context),
    }),
  });
  const threadId = payload.thread?.id?.trim();
  if (!threadId) {
    throw new Error('Agent service returned an empty thread id.');
  }
  persistTutorThreadId(threadId);
  return threadId;
}

function buildAgentChatBody(history: TutorMessage[], context?: TutorRequestContext, threadId?: string) {
  const latestUserMessage = [...history].reverse().find((message) => message.role === 'user')?.text.trim() ?? '';
  if (!latestUserMessage) {
    throw new Error('AI Tutor requires a learner message.');
  }

  return {
    thread_id: threadId,
    message: latestUserMessage,
    history: history.slice(0, -1),
    context: buildTutorContext(context),
  };
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

async function requestAgentReply(history: TutorMessage[], context?: TutorRequestContext) {
  const threadId = await ensureTutorThreadId(context);
  const response = await fetchAgentJson<{ thread_id?: string; reply?: string; detail?: string; used_tools?: string[] }>('/v1/chat', {
    method: 'POST',
    body: JSON.stringify(buildAgentChatBody(history, context, threadId)),
  });

  if (response.thread_id?.trim()) {
    persistTutorThreadId(response.thread_id.trim());
  }
  if (!response.reply?.trim()) {
    throw new Error('AI Tutor agent returned an empty response.');
  }
  return {
    threadId: response.thread_id?.trim() || threadId,
    reply: response.reply.trim(),
    usedTools: response.used_tools ?? [],
  };
}

async function requestAgentReplyStream(history: TutorMessage[], handlers: TutorReplyStreamHandlers = {}, context?: TutorRequestContext) {
  const threadId = await ensureTutorThreadId(context);
  const accessToken = await getAgentAccessToken();
  const timeout = createTimeoutSignal(TUTOR_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(agentServiceUrl('/v1/chat/stream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(buildAgentChatBody(history, context, threadId)),
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
    return requestAgentReply(history, context);
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
          persistTutorThreadId(payload.thread_id);
          handlers.onRunStarted?.({ threadId: payload.thread_id });
          continue;
        }

        if (parsed.event === 'token' && payload.text) {
          reply += payload.text;
          handlers.onToken?.(payload.text);
          continue;
        }

        if (parsed.event === 'final') {
          if (payload.thread_id) {
            persistTutorThreadId(payload.thread_id);
          }
          finalPayload = {
            threadId: payload.thread_id || threadId,
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
      threadId,
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

async function requestTutorTool<T>(path: '/v1/tools/mindmap' | '/v1/tools/quiz' | '/v1/tools/presentation', history: TutorMessage[], context?: TutorRequestContext) {
  if (usesViewerFixtures()) {
    if (path.endsWith('/mindmap')) {
      return {
        title: 'Fixture mind map',
        nodes: history.slice(-3).map((message, index) => ({
          id: `node-${index + 1}`,
          label: message.text.slice(0, 40) || `Idea ${index + 1}`,
        })),
      } as T;
    }
    if (path.endsWith('/quiz')) {
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

  return fetchAgentJson<T>(path, {
    method: 'POST',
    body: JSON.stringify({
      history,
      context: buildTutorContext(context),
    }),
  });
}

export async function generateTutorReply(history: TutorMessage[], context?: TutorRequestContext) {
  if (usesViewerFixtures()) {
    return fixtureReply(history);
  }
  const response = await requestAgentReply(history, context);
  return response.reply;
}

export async function generateTutorReplyStream(
  history: TutorMessage[],
  handlers: TutorReplyStreamHandlers = {},
  context?: TutorRequestContext,
) {
  if (usesViewerFixtures()) {
    const reply = fixtureReply(history);
    const threadId = getStoredTutorThreadId() || 'viewer:fixture:thread';
    const payload = { threadId, reply, usedTools: [] };
    handlers.onToken?.(reply);
    handlers.onFinal?.(payload);
    return payload;
  }

  try {
    return await requestAgentReplyStream(history, handlers, context);
  } catch (error) {
    if (handlers.onError && error instanceof Error) {
      handlers.onError(error);
    }
    throw error;
  }
}

export async function generateMindMap(history: TutorMessage[], context?: TutorRequestContext) {
  return requestTutorTool<{ title: string; nodes: Array<{ id: string; label: string }> }>('/v1/tools/mindmap', history, context);
}

export async function generateQuiz(history: TutorMessage[], context?: TutorRequestContext) {
  return requestTutorTool<{
    title: string;
    questions: Array<{
      prompt: string;
      options: string[];
      answerIndex: number;
    }>;
  }>('/v1/tools/quiz', history, context);
}

export async function generatePresentation(history: TutorMessage[], context?: TutorRequestContext) {
  return requestTutorTool<{
    title: string;
    slides: Array<{ title: string; bullet: string }>;
  }>('/v1/tools/presentation', history, context);
}
