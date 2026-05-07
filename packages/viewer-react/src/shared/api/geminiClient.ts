import { supabase } from '@/shared/api/supabase';
import { normalizeAiTutorPersona } from '@/shared/ai-tutor/persona';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { normalizeViewerLanguage, viewerLanguageToLocale } from '@/shared/i18n/locale';
import {
  buildLocalInteractiveVisualReply,
  looksLikeInteractiveVisualRequest,
  serializeTutorInteractiveVisual,
  type TutorInteractiveVisualPayload,
} from '@/shared/interactive-visual/tutorInteractiveVisuals';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';

const GEMINI_STORAGE_KEY = 'primoria.viewer.gemini-api-key';
const TUTOR_THREAD_STORAGE_KEY = 'primoria.viewer.ai-tutor-thread-id';
const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
const rawAgentServiceUrl = (import.meta.env.VITE_AGENT_SERVICE_URL as string | undefined)?.trim() ?? '';
const TUTOR_TIMEOUT_MS = 30_000;
const EDGE_REQUEST_MAX_ATTEMPTS = 2;
const EDGE_REQUEST_RETRY_DELAY_MS = 500;

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

export type TutorRequestContext = {
  surface?: string;
  courseId?: string;
  lessonId?: string;
  blockId?: string;
  locale?: string;
  lessonTitle?: string;
  pageIndex?: number;
  pageCount?: number;
  pageTitle?: string;
  pageContent?: string;
  learnerState?: string;
};

export type TutorRequestOptions = {
  provider?: 'auto' | 'gemini';
  model?: string;
  allowModelFallback?: boolean;
  context?: TutorRequestContext;
  aiProvider?: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
};

type InteractiveVisualServiceResponse = TutorInteractiveVisualPayload;

function activeModel(override?: string) {
  return override?.trim() || (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || 'gemini-2.0-flash';
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readErrorText(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }
  if (!error || typeof error !== 'object') {
    return typeof error === 'string' ? error.trim() : '';
  }
  const record = error as Record<string, unknown>;
  return ['message', 'detail', 'details', 'hint', 'error', 'error_description']
    .map((key) => record[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .trim();
}

function localizedAiUnavailableMessage() {
  return currentUiLanguage() === 'zh-CN'
    ? 'AI 暂时不可用，请稍后再试。'
    : 'AI is temporarily unavailable. Please try again shortly.';
}

function isServiceUnavailableStatus(status: number) {
  return status >= 500;
}

function isTransportFailureMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('load failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('bad gateway') ||
    normalized.includes('failed to send a request to the edge function') ||
    normalized.includes('relay error invoking the edge function') ||
    normalized.includes('timed out') ||
    normalized.includes('<html>')
  );
}

function normalizeTutorError(error: unknown) {
  const message = readErrorText(error);
  if (
    (error instanceof Error && error.name === 'AbortError') ||
    isTransportFailureMessage(message)
  ) {
    return new Error(localizedAiUnavailableMessage());
  }

  if (error instanceof Error) {
    return error;
  }
  return new Error(message || localizedAiUnavailableMessage());
}

function extractBalancedJsonObject(text: string) {
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let isEscaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (char === '\\') {
          isEscaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        depth += 1;
        continue;
      }

      if (char !== '}') {
        continue;
      }

      depth -= 1;
      if (depth !== 0) {
        continue;
      }

      const candidate = text.slice(start, index + 1).trim();
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return candidate;
        }
      } catch {
        break;
      }
      break;
    }
  }

  return null;
}

function normalizeJsonText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1];
  const normalized = (fenced ?? trimmed).trim();
  return extractBalancedJsonObject(normalized) ?? normalized;
}

function parseJsonObject(text: string) {
  const normalized = normalizeJsonText(text);
  if (!normalized) {
    return null;
  }
  try {
    const parsed = JSON.parse(normalized) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function buildHttpError(status: number, text: string, fallback: string) {
  if (isServiceUnavailableStatus(status)) {
    return new Error(localizedAiUnavailableMessage());
  }
  const parsed = parseJsonObject(text);
  const message =
    (parsed && typeof parsed.error === 'string' && parsed.error.trim()) ||
    (parsed && typeof parsed.detail === 'string' && parsed.detail.trim()) ||
    text.trim() ||
    fallback;
  return normalizeTutorError(new Error(message));
}

function shouldFallbackToEdgeFunction(options: TutorRequestOptions) {
  return options.provider !== 'gemini' && Boolean(rawSupabaseUrl && rawSupabaseAnonKey);
}

function shouldRetryEdgeFunctionStatus(status: number) {
  return isServiceUnavailableStatus(status);
}

function shouldRetryEdgeFunctionError(error: unknown) {
  const message = readErrorText(error);
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    isTransportFailureMessage(message)
  );
}

function waitForEdgeRetry() {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, EDGE_REQUEST_RETRY_DELAY_MS);
  });
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

function latestTutorUserPrompt(history: TutorMessage[]) {
  return [...history].reverse().find((message) => message.role === 'user')?.text.trim() ?? '';
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

function interactiveVisualFunctionUrl() {
  if (!rawSupabaseUrl) {
    throw new Error('Interactive visual generation requires VITE_SUPABASE_URL.');
  }

  if (rawSupabaseUrl.includes('.supabase.co')) {
    return `${rawSupabaseUrl.replace('.supabase.co', '.functions.supabase.co')}/viewer-ai-interactive-visual`;
  }

  return `${rawSupabaseUrl.replace(/\/$/, '')}/functions/v1/viewer-ai-interactive-visual`;
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

function buildAgentRequestContext(context?: TutorRequestContext, options?: TutorRequestOptions) {
  return {
    surface: normalizeOptionalString(context?.surface) ?? 'ai-tutor',
    course_id: normalizeOptionalString(context?.courseId),
    lesson_id: normalizeOptionalString(context?.lessonId),
    block_id: normalizeOptionalString(context?.blockId),
    locale: normalizeOptionalString(context?.locale) ?? viewerLanguageToLocale(currentUiLanguage()),
    lesson_title: normalizeOptionalString(context?.lessonTitle),
    page_index: normalizeOptionalNumber(context?.pageIndex),
    page_count: normalizeOptionalNumber(context?.pageCount),
    page_title: normalizeOptionalString(context?.pageTitle),
    page_content: normalizeOptionalString(context?.pageContent),
    learner_state: normalizeOptionalString(context?.learnerState),
    ai_tutor_persona: currentAiTutorPersona(),
    ai_provider: normalizeOptionalString(options?.aiProvider),
    ai_base_url: normalizeOptionalString(options?.aiBaseUrl),
    ai_api_key: normalizeOptionalString(options?.aiApiKey),
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

function formatInteractiveVisualReply(payload: InteractiveVisualServiceResponse, language: 'zh-CN' | 'en') {
  const intro =
    language === 'zh-CN'
      ? '下面是一个可直接操作的图像。'
      : 'Here is an interactive graph you can explore right away.';
  const outro =
    language === 'zh-CN'
      ? '拖动滑块、点击关键角按钮，并观察单位圆上的点如何同步改变两条曲线。'
      : 'Drag the slider, tap the key-angle buttons, and watch how the unit-circle point updates both curves together.';

  return `${intro}\n\n${serializeTutorInteractiveVisual(payload)}\n\n${outro}`;
}

async function requestInteractiveVisual(
  prompt: string,
  options: TutorRequestOptions = {},
): Promise<InteractiveVisualServiceResponse> {
  if (!rawSupabaseAnonKey) {
    throw new Error('Interactive visual generation requires VITE_SUPABASE_ANON_KEY.');
  }

  const accessToken = await getAgentAccessToken();
  const timeout = createTimeoutSignal(TUTOR_TIMEOUT_MS);
  try {
    const response = await fetch(interactiveVisualFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: rawSupabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        prompt,
        language: currentUiLanguage(),
        surface: options.context?.surface === 'builder' ? 'builder' : 'ai-tutor',
        experienceMode: 'graph',
      }),
      signal: timeout.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw buildHttpError(response.status, text, `Interactive visual request failed with HTTP ${response.status}.`);
    }

    const parsed = parseJsonObject(text);
    if (
      !parsed ||
      typeof parsed.title !== 'string' ||
      typeof parsed.description !== 'string' ||
      typeof parsed.generatedHtml !== 'string'
    ) {
      throw new Error('Interactive visual response was invalid.');
    }

    return {
      title: parsed.title,
      description: parsed.description,
      generatedHtml: parsed.generatedHtml,
      template: typeof parsed.template === 'string' ? parsed.template : undefined,
      experienceMode:
        parsed.experienceMode === 'simulation' ||
        parsed.experienceMode === 'graph' ||
        parsed.experienceMode === 'scenario' ||
        parsed.experienceMode === 'story'
          ? parsed.experienceMode
          : undefined,
      themeTone: typeof parsed.themeTone === 'string' ? parsed.themeTone : undefined,
    };
  } catch (error) {
    throw normalizeTutorError(error);
  } finally {
    timeout.cleanup();
  }
}

async function maybeGenerateInteractiveVisualReply(
  history: TutorMessage[],
  options: TutorRequestOptions = {},
): Promise<TutorReplyStreamResult | null> {
  const prompt = latestTutorUserPrompt(history);
  if (!looksLikeInteractiveVisualRequest(prompt)) {
    return null;
  }

  const language = currentUiLanguage();

  try {
    if (rawSupabaseUrl && rawSupabaseAnonKey) {
      const payload = await requestInteractiveVisual(prompt, options);
      return {
        threadId: getTutorThreadId(),
        reply: formatInteractiveVisualReply(payload, language),
        usedTools: ['interactive_visual'],
      };
    }
  } catch {
    const localReply = buildLocalInteractiveVisualReply(prompt, language);
    if (localReply) {
      return {
        threadId: getTutorThreadId(),
        reply: localReply,
        usedTools: ['interactive_visual_local'],
      };
    }
  }

  const localReply = buildLocalInteractiveVisualReply(prompt, language);
  if (!localReply) {
    return null;
  }

  return {
    threadId: getTutorThreadId(),
    reply: localReply,
    usedTools: ['interactive_visual_local'],
  };
}

function buildAgentChatBody(history: TutorMessage[], options: TutorRequestOptions = {}) {
  const latestUserMessage = latestTutorUserPrompt(history);
  if (!latestUserMessage) {
    throw new Error('AI Tutor requires a learner message.');
  }

  return {
    thread_id: getTutorThreadId(),
    message: latestUserMessage,
    history: history.slice(0, -1),
    context: buildAgentRequestContext(options.context, options),
  };
}

async function requestAgentReply(history: TutorMessage[], options: TutorRequestOptions = {}) {
  const chatUrl = agentServiceChatUrl();
  if (!chatUrl) {
    return null;
  }

  const accessToken = await getAgentAccessToken();
  const timeout = createTimeoutSignal(TUTOR_TIMEOUT_MS);
  try {
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(buildAgentChatBody(history, options)),
      signal: timeout.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw buildHttpError(response.status, text, `AI Tutor agent failed with HTTP ${response.status}.`);
    }

    const payload = parseJsonObject(text);
    if (!payload || typeof payload.reply !== 'string' || !payload.reply.trim()) {
      throw new Error('AI Tutor agent returned an empty response.');
    }
    return payload.reply.trim();
  } catch (error) {
    throw normalizeTutorError(error);
  } finally {
    timeout.cleanup();
  }
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

async function requestAgentReplyStream(
  history: TutorMessage[],
  handlers: TutorReplyStreamHandlers = {},
  options: TutorRequestOptions = {},
) {
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
      body: JSON.stringify(buildAgentChatBody(history, options)),
      signal: timeout.signal,
    });
  } catch (error) {
    timeout.cleanup();
    throw normalizeTutorError(error);
  }

  if (!response.ok) {
    const text = await response.text();
    timeout.cleanup();
    throw buildHttpError(response.status, text, `AI Tutor agent failed with HTTP ${response.status}.`);
  }

  if (!response.body) {
    timeout.cleanup();
    const reply = await requestAgentReply(history, options);
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
          throw normalizeTutorError(new Error(payload.detail || 'AI Tutor agent stream failed.'));
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

async function requestTutorTool<T>(
  mode: 'reply' | 'mindmap' | 'quiz',
  history: TutorMessage[],
  options: TutorRequestOptions = {},
) {
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
  }

  if (mode === 'reply' && options.provider !== 'gemini') {
    try {
      const agentReply = await requestAgentReply(history, options);
      if (agentReply) {
        return { reply: agentReply } as T;
      }
    } catch (error) {
      if (!shouldFallbackToEdgeFunction(options)) {
        throw normalizeTutorError(error);
      }
    }
  }

  const apiKeyOverride = getStoredGeminiKey();
  if (!rawSupabaseAnonKey) {
    throw new Error('AI Tutor requires VITE_SUPABASE_ANON_KEY.');
  }

  for (let attempt = 1; attempt <= EDGE_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    const timeout = createTimeoutSignal(TUTOR_TIMEOUT_MS);
    try {
      const response = await fetch(tutorFunctionUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: rawSupabaseAnonKey,
          Authorization: `Bearer ${rawSupabaseAnonKey}`,
        },
        body: JSON.stringify({
          mode,
          model: activeModel(options.model),
          history,
          persona: currentAiTutorPersona(),
          allowModelFallback: options.allowModelFallback ?? true,
          context: options.context,
          apiKeyOverride: apiKeyOverride || undefined,
        }),
        signal: timeout.signal,
      });

      const text = await response.text();
      const parsed = parseJsonObject(text);
      if (!response.ok) {
        if (attempt < EDGE_REQUEST_MAX_ATTEMPTS && shouldRetryEdgeFunctionStatus(response.status)) {
          await waitForEdgeRetry();
          continue;
        }
        throw buildHttpError(response.status, text, `AI Tutor request failed with HTTP ${response.status}.`);
      }
      if (!parsed) {
        throw new Error('AI Tutor returned invalid JSON.');
      }
      return parsed as T;
    } catch (error) {
      if (attempt < EDGE_REQUEST_MAX_ATTEMPTS && shouldRetryEdgeFunctionError(error)) {
        await waitForEdgeRetry();
        continue;
      }
      throw normalizeTutorError(error);
    } finally {
      timeout.cleanup();
    }
  }

  throw new Error('AI Tutor request failed after retry.');
}

export async function generateTutorReply(history: TutorMessage[], options: TutorRequestOptions = {}) {
  const visualReply = await maybeGenerateInteractiveVisualReply(history, options);
  if (visualReply) {
    return visualReply.reply;
  }

  const response = await requestTutorTool<{ reply: string }>('reply', history, options);
  return response.reply;
}

export async function generateTutorReplyStream(
  history: TutorMessage[],
  handlers: TutorReplyStreamHandlers = {},
  options: TutorRequestOptions = {},
) {
  const visualReply = await maybeGenerateInteractiveVisualReply(history, options);
  if (visualReply) {
    handlers.onToken?.(visualReply.reply);
    handlers.onFinal?.(visualReply);
    return visualReply;
  }

  if (usesViewerFixtures()) {
    const reply = fixtureReply(history);
    const payload = { threadId: getTutorThreadId(), reply, usedTools: [] };
    handlers.onToken?.(reply);
    handlers.onFinal?.(payload);
    return payload;
  }

  let agentError: Error | null = null;
  try {
    const streamed = options.provider === 'gemini' ? null : await requestAgentReplyStream(history, handlers, options);
    if (streamed) {
      return streamed;
    }
  } catch (error) {
    const normalized = normalizeTutorError(error);
    if (!shouldFallbackToEdgeFunction(options)) {
      handlers.onError?.(normalized);
      throw normalized;
    }
    agentError = normalized;
  }

  const reply = await generateTutorReply(
    history,
    agentError ? { ...options, provider: 'gemini' } : options,
  );
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
