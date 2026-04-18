import type { TutorMessage } from '@/shared/api/geminiClient';
import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';
import type { LegacyMindMapNode, TutorDocument } from '@/shared/api/viewer/types';
import type {
  PendingTutorUpload,
  StoredAiTutorSession,
  TutorConversationContext,
  TutorToolKind,
  TutorToolRuntime,
} from '@/features/ai-tutor/aiTutorTypes';

export const AI_TUTOR_SESSION_STORAGE_KEY = 'viewer:ai-tutor-session:v3';
export const AI_TUTOR_LEGACY_SESSION_STORAGE_KEY = 'viewer:ai-tutor-session:v2';
export const SESSION_MESSAGE_LIMIT = 16;
export const TOOL_ORDER: TutorToolKind[] = ['mindmap', 'quiz'];
export const EMPTY_TUTOR_DOCUMENTS: TutorDocument[] = [];
export const TUTOR_QUIZ_SERVICE_UNAVAILABLE_CODE = 'TUTOR_QUIZ_SERVICE_UNAVAILABLE';
export const TUTOR_MINDMAP_SERVICE_UNAVAILABLE_CODE = 'TUTOR_MINDMAP_SERVICE_UNAVAILABLE';

export function replaceLastModelMessage(messages: TutorMessage[], text: string): TutorMessage[] {
  const next: TutorMessage[] = [...messages];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index]?.role === 'model') {
      next[index] = { ...next[index], text };
      return next;
    }
  }
  return [...next, { role: 'model', text }];
}

export function defaultTutorMessages(welcomeBody: string): TutorMessage[] {
  return [{ role: 'model', text: welcomeBody }];
}

export function interpolateCount(template: string, count: number) {
  return template.replace('{count}', String(count));
}

export function createEmptyToolRuntime(): Record<TutorToolKind, TutorToolRuntime> {
  return {
    mindmap: { status: 'idle', modal: null, updatedAt: null, errorMessage: null },
    quiz: { status: 'idle', modal: null, updatedAt: null, errorMessage: null },
  };
}

export function isTutorMessage(value: unknown): value is TutorMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as { role?: unknown; text?: unknown };
  return (
    (message.role === 'user' || message.role === 'model') &&
    typeof message.text === 'string'
  );
}

export function isMindMapNode(value: unknown): value is LegacyMindMapNode {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const node = value as { id?: unknown; label?: unknown; children?: unknown };
  if (typeof node.id !== 'string' || typeof node.label !== 'string') {
    return false;
  }

  if (node.children === undefined) {
    return true;
  }

  return Array.isArray(node.children) && node.children.every((child) => isMindMapNode(child));
}

export function isTutorToolModal(value: unknown): value is TutorToolModal {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('payload' in value)) {
    return false;
  }

  const modal = value as { kind?: unknown; payload?: Record<string, unknown> };

  if (modal.kind === 'mindmap') {
    return (
      typeof modal.payload?.title === 'string' &&
      Array.isArray(modal.payload?.sourceDocumentIds) &&
      typeof modal.payload?.userPrompt === 'string' &&
      isMindMapNode(modal.payload?.root)
    );
  }

  if (modal.kind === 'quiz') {
    return (
      typeof modal.payload?.courseId === 'string' &&
      typeof modal.payload?.courseTitle === 'string' &&
      typeof modal.payload?.questionCount === 'number' &&
      Array.isArray(modal.payload?.sourceDocumentIds)
    );
  }

  return false;
}

export function normalizeStoredMessages(messages: TutorMessage[], welcomeBody: string) {
  const sanitized = messages.filter(isTutorMessage);
  if (!sanitized.length) {
    return defaultTutorMessages(welcomeBody);
  }
  const limited = sanitized.slice(-SESSION_MESSAGE_LIMIT);
  if (limited[0]?.role === 'model') {
    return limited;
  }
  return [...defaultTutorMessages(welcomeBody), ...limited];
}

export function readAiTutorSession(welcomeBody: string) {
  const fallback = {
    messages: defaultTutorMessages(welcomeBody),
    toolRuntime: createEmptyToolRuntime(),
    context: null as TutorConversationContext | null,
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw =
      window.localStorage.getItem(AI_TUTOR_SESSION_STORAGE_KEY) ??
      window.localStorage.getItem(AI_TUTOR_LEGACY_SESSION_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<StoredAiTutorSession>;
    const toolRuntime = createEmptyToolRuntime();

    if (Array.isArray(parsed.artifacts)) {
      parsed.artifacts.forEach((artifact) => {
        if (!isTutorToolModal(artifact?.modal) || typeof artifact?.updatedAt !== 'number') {
          return;
        }
        toolRuntime[artifact.modal.kind] = {
          status: 'success',
          modal: artifact.modal,
          updatedAt: artifact.updatedAt,
          errorMessage: null,
        };
      });
    }

    const context =
      parsed.context &&
      typeof parsed.context === 'object' &&
      (parsed.context.source === 'home-companion' || parsed.context.source === 'manual')
        ? {
            source: parsed.context.source,
            courseTitle: typeof parsed.context.courseTitle === 'string' ? parsed.context.courseTitle : null,
          }
        : null;

    return {
      messages: normalizeStoredMessages(Array.isArray(parsed.messages) ? parsed.messages : [], welcomeBody),
      toolRuntime,
      context,
    };
  } catch {
    return fallback;
  }
}

export function persistAiTutorSession({
  messages,
  toolRuntime,
  context,
}: {
  messages: TutorMessage[];
  toolRuntime: Record<TutorToolKind, TutorToolRuntime>;
  context: TutorConversationContext | null;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  const sanitizedMessages = messages.filter(isTutorMessage);
  const lastMessage = sanitizedMessages[sanitizedMessages.length - 1];
  if (lastMessage?.role === 'model' && !lastMessage.text.trim()) {
    sanitizedMessages.pop();
  }

  const artifacts = TOOL_ORDER.flatMap((kind) => {
    const runtime = toolRuntime[kind];
    return runtime.modal && runtime.updatedAt
      ? [{ modal: runtime.modal, updatedAt: runtime.updatedAt }]
      : [];
  });

  if (sanitizedMessages.length <= 1 && !artifacts.length && !context?.courseTitle) {
    window.localStorage.removeItem(AI_TUTOR_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(AI_TUTOR_LEGACY_SESSION_STORAGE_KEY);
    return;
  }

  const payload: StoredAiTutorSession = {
    version: 3,
    messages: sanitizedMessages.slice(-SESSION_MESSAGE_LIMIT),
    artifacts,
    context,
  };
  window.localStorage.removeItem(AI_TUTOR_LEGACY_SESSION_STORAGE_KEY);
  window.localStorage.setItem(AI_TUTOR_SESSION_STORAGE_KEY, JSON.stringify(payload));
}

export function artifactTitle(modal: TutorToolModal | null, fallback: string) {
  if (!modal) {
    return fallback;
  }
  return modal.kind === 'quiz' ? modal.payload.courseTitle : modal.payload.title;
}

export function formatDocumentType(document: Pick<TutorDocument, 'filename' | 'mime_type'> | Pick<PendingTutorUpload, 'filename' | 'mimeType'>) {
  const filename = document.filename.toLowerCase();
  const mimeType = 'mime_type' in document ? document.mime_type : document.mimeType;

  if (filename.endsWith('.pdf') || mimeType.includes('pdf')) {
    return 'PDF';
  }
  if (filename.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
    return 'DOCX';
  }
  if (filename.endsWith('.ppt') || filename.endsWith('.pptx') || mimeType.includes('presentation')) {
    return 'PPT';
  }
  if (filename.endsWith('.doc') || mimeType.includes('msword')) {
    return 'DOC';
  }
  return mimeType ? mimeType.toUpperCase() : 'FILE';
}

export function resolveDocumentTitle(document: Pick<TutorDocument, 'filename' | 'display_title'>) {
  return document.display_title?.trim() || document.filename;
}

export function readTutorErrorText(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (!error || typeof error !== 'object') {
    return '';
  }

  const record = error as Record<string, unknown>;
  const parts = ['message', 'details', 'hint', 'error_description']
    .map((key) => record[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return parts.join(' ').trim();
}

export function isTutorDocumentsUnavailableError(error: unknown, rawMessage: string) {
  const normalizedMessage = rawMessage.toLowerCase();
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const code = typeof record?.code === 'string' ? record.code : '';
  const status = typeof record?.status === 'number' ? record.status : Number.NaN;

  if (code === 'PGRST205') {
    return true;
  }

  if (!normalizedMessage.includes('tutor_documents')) {
    return false;
  }

  return (
    status === 404 ||
    normalizedMessage.includes('schema cache') ||
    normalizedMessage.includes('does not exist') ||
    normalizedMessage.includes('could not find the table')
  );
}

export function resolveTutorErrorMessage(error: unknown, fallback: string, materialsUnavailable: string) {
  const rawMessage = readTutorErrorText(error);
  if (isTutorDocumentsUnavailableError(error, rawMessage)) {
    return materialsUnavailable;
  }
  return rawMessage || fallback;
}

export function isTutorQuizServiceUnavailableError(error: unknown, rawMessage: string) {
  const normalizedMessage = rawMessage.toLowerCase();
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const code = typeof record?.code === 'string' ? record.code : '';
  const name = typeof record?.name === 'string' ? record.name : '';
  const status = typeof record?.status === 'number' ? record.status : Number.NaN;

  if (code === TUTOR_QUIZ_SERVICE_UNAVAILABLE_CODE) {
    return true;
  }

  return (
    name === 'FunctionsFetchError' ||
    name === 'FunctionsRelayError' ||
    normalizedMessage.includes('failed to send a request to the edge function') ||
    normalizedMessage.includes('relay error invoking the edge function') ||
    (status === 404 && normalizedMessage.includes('function') && normalizedMessage.includes('not found'))
  );
}

export function isTutorMindMapServiceUnavailableError(error: unknown, rawMessage: string) {
  const normalizedMessage = rawMessage.toLowerCase();
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const code = typeof record?.code === 'string' ? record.code : '';
  const name = typeof record?.name === 'string' ? record.name : '';
  const status = typeof record?.status === 'number' ? record.status : Number.NaN;

  if (code === TUTOR_MINDMAP_SERVICE_UNAVAILABLE_CODE) {
    return true;
  }

  return (
    name === 'FunctionsFetchError' ||
    name === 'FunctionsRelayError' ||
    normalizedMessage.includes('failed to send a request to the edge function') ||
    normalizedMessage.includes('relay error invoking the edge function') ||
    (status === 404 && normalizedMessage.includes('function') && normalizedMessage.includes('not found'))
  );
}

export function resolveQuizErrorMessage(
  error: unknown,
  fallback: string,
  materialsUnavailable: string,
  quizUnavailable: string,
) {
  const rawMessage = readTutorErrorText(error);
  if (isTutorDocumentsUnavailableError(error, rawMessage)) {
    return materialsUnavailable;
  }
  if (isTutorQuizServiceUnavailableError(error, rawMessage)) {
    return quizUnavailable;
  }
  return rawMessage || fallback;
}

export function resolveMindMapErrorMessage(
  error: unknown,
  fallback: string,
  materialsUnavailable: string,
  mindMapUnavailable: string,
) {
  const rawMessage = readTutorErrorText(error);
  if (isTutorDocumentsUnavailableError(error, rawMessage)) {
    return materialsUnavailable;
  }
  if (isTutorMindMapServiceUnavailableError(error, rawMessage)) {
    return mindMapUnavailable;
  }
  return rawMessage || fallback;
}
