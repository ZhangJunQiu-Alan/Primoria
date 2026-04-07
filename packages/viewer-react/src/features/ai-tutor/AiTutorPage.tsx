import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  bootstrapGeminiKey,
  generateMindMap,
  generatePresentation,
  generateTutorReply,
  generateTutorReplyStream,
  persistGeminiKey,
  type TutorMessage,
} from '@/shared/api/geminiClient';
import { createQuizFromDocs, createTutorDocument, deleteTutorDocument, fetchTutorDocuments } from '@/shared/api/viewer/tutorDocumentsApi';
import {
  BadgeHelp,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  GitBranch,
  LoaderCircle,
  PenLine,
  SendHorizontal,
  Sparkles,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { extractTutorDocumentText } from '@/features/ai-tutor/documentExtraction';
import { getAiTutorPersonaDefinition } from '@/shared/ai-tutor/persona';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';
import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';
import type { TutorDocument } from '@/shared/api/viewer/types';

const AiTutorToolDialog = lazy(async () => ({
  default: (await import('@/features/ai-tutor/AiTutorToolDialog')).AiTutorToolDialog,
}));

type TutorToolKind = TutorToolModal['kind'];
type ToolExecutionStatus = 'idle' | 'loading' | 'success' | 'error';
type TutorStatusTone = 'info' | 'success' | 'error';
type TutorConversationContext = {
  source: 'home-companion' | 'manual';
  courseTitle: string | null;
};
type TutorToolRuntime = {
  status: ToolExecutionStatus;
  modal: TutorToolModal | null;
  updatedAt: number | null;
  errorMessage: string | null;
};
type TutorStatusNotice = {
  tone: TutorStatusTone;
  text: string;
};
type StoredTutorArtifact = {
  modal: TutorToolModal;
  updatedAt: number;
};
type StoredAiTutorSession = {
  version: 2;
  messages: TutorMessage[];
  artifacts: StoredTutorArtifact[];
  context: TutorConversationContext | null;
};
type PendingTutorUpload = {
  id: string;
  filename: string;
  mimeType: string;
};
type TutorSidebarSection = 'workspace' | 'materials' | 'notebook';

const AI_TUTOR_SESSION_STORAGE_KEY = 'viewer:ai-tutor-session:v2';
const SESSION_MESSAGE_LIMIT = 16;
const TOOL_ORDER: TutorToolKind[] = ['mindmap', 'report', 'quiz', 'presentation'];
const EMPTY_TUTOR_DOCUMENTS: TutorDocument[] = [];
const TUTOR_QUIZ_SERVICE_UNAVAILABLE_CODE = 'TUTOR_QUIZ_SERVICE_UNAVAILABLE';

function replaceLastModelMessage(messages: TutorMessage[], text: string): TutorMessage[] {
  const next: TutorMessage[] = [...messages];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index]?.role === 'model') {
      next[index] = { ...next[index], text };
      return next;
    }
  }
  return [...next, { role: 'model', text }];
}

function defaultTutorMessages(welcomeBody: string): TutorMessage[] {
  return [{ role: 'model', text: welcomeBody }];
}

function interpolateCount(template: string, count: number) {
  return template.replace('{count}', String(count));
}

function buildCompanionToolPrompt(
  language: 'zh-CN' | 'en',
  intent: 'mindmap' | 'quiz',
  courseTitle?: string | null,
) {
  if (intent === 'quiz') {
    return language === 'zh-CN'
      ? `请围绕当前课程《${courseTitle || '当前课程'}》整理一份考前测验重点。`
      : `Summarize the most important quiz topics for the current course "${courseTitle || 'Current course'}".`;
  }

  return language === 'zh-CN'
    ? `请围绕当前课程《${courseTitle || '当前课程'}》生成一张思维导图，把知识结构和关键连接整理清楚。`
    : `Generate a mind map for the current course "${courseTitle || 'Current course'}" and make the structure plus key connections clear.`;
}

function buildStudyReportPrompt(language: 'zh-CN' | 'en', courseTitle?: string | null) {
  if (language === 'zh-CN') {
    return `请基于当前对话${courseTitle ? `和课程《${courseTitle}》` : ''}生成一份学习报告。报告需要简洁清晰，至少包含：当前主题、已经理清的重点、仍需补强的地方，以及接下来最值得做的 3 个行动。`;
  }

  return `Create a concise study report based on this conversation${courseTitle ? ` and the course "${courseTitle}"` : ''}. Include the current topic, the points that are now clearer, the parts that still need work, and the next 3 actions worth taking.`;
}

function createEmptyToolRuntime(): Record<TutorToolKind, TutorToolRuntime> {
  return {
    mindmap: { status: 'idle', modal: null, updatedAt: null, errorMessage: null },
    report: { status: 'idle', modal: null, updatedAt: null, errorMessage: null },
    quiz: { status: 'idle', modal: null, updatedAt: null, errorMessage: null },
    presentation: { status: 'idle', modal: null, updatedAt: null, errorMessage: null },
  };
}

function isTutorMessage(value: unknown): value is TutorMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as { role?: unknown; text?: unknown };
  return (
    (message.role === 'user' || message.role === 'model') &&
    typeof message.text === 'string'
  );
}

function isTutorToolModal(value: unknown): value is TutorToolModal {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('payload' in value)) {
    return false;
  }

  const modal = value as { kind?: unknown; payload?: Record<string, unknown> };

  if (modal.kind === 'mindmap') {
    return Array.isArray(modal.payload?.nodes) && typeof modal.payload?.title === 'string';
  }

  if (modal.kind === 'report') {
    return typeof modal.payload?.title === 'string' && typeof modal.payload?.body === 'string';
  }

  if (modal.kind === 'quiz') {
    return (
      typeof modal.payload?.courseId === 'string' &&
      typeof modal.payload?.courseTitle === 'string' &&
      typeof modal.payload?.questionCount === 'number' &&
      Array.isArray(modal.payload?.sourceDocumentIds)
    );
  }

  if (modal.kind === 'presentation') {
    return Array.isArray(modal.payload?.slides) && typeof modal.payload?.title === 'string';
  }

  return false;
}

function normalizeStoredMessages(messages: TutorMessage[], welcomeBody: string) {
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

function readAiTutorSession(welcomeBody: string) {
  const fallback = {
    messages: defaultTutorMessages(welcomeBody),
    toolRuntime: createEmptyToolRuntime(),
    context: null as TutorConversationContext | null,
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(AI_TUTOR_SESSION_STORAGE_KEY);
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

function persistAiTutorSession({
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
    return;
  }

  const payload: StoredAiTutorSession = {
    version: 2,
    messages: sanitizedMessages.slice(-SESSION_MESSAGE_LIMIT),
    artifacts,
    context,
  };
  window.localStorage.setItem(AI_TUTOR_SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function artifactTitle(modal: TutorToolModal | null, fallback: string) {
  if (!modal) {
    return fallback;
  }
  return modal.kind === 'quiz' ? modal.payload.courseTitle : modal.payload.title;
}

function formatDocumentType(document: Pick<TutorDocument, 'filename' | 'mime_type'> | Pick<PendingTutorUpload, 'filename' | 'mimeType'>) {
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

function readTutorErrorText(error: unknown) {
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

function isTutorDocumentsUnavailableError(error: unknown, rawMessage: string) {
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

function resolveTutorErrorMessage(error: unknown, fallback: string, materialsUnavailable: string) {
  const rawMessage = readTutorErrorText(error);
  if (isTutorDocumentsUnavailableError(error, rawMessage)) {
    return materialsUnavailable;
  }
  return rawMessage || fallback;
}

function isTutorQuizServiceUnavailableError(error: unknown, rawMessage: string) {
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

function resolveQuizErrorMessage(
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

export function AiTutorPage() {
  const language = useProductLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const aiTutorPersona = useAppSelector((state) => state.viewerPreferences.aiTutorPersona);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const copy = useViewerCopy();
  const personaCopy = getAiTutorPersonaDefinition(aiTutorPersona, language);
  const initialSessionRef = useRef<ReturnType<typeof readAiTutorSession> | null>(null);
  if (initialSessionRef.current === null) {
    initialSessionRef.current = readAiTutorSession(personaCopy.welcomeBody);
  }
  const initialSession = initialSessionRef.current;
  const [messages, setMessages] = useState<TutorMessage[]>(() => initialSession.messages);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<TutorStatusNotice | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [modal, setModal] = useState<TutorToolModal | null>(null);
  const [toolRuntime, setToolRuntime] = useState<Record<TutorToolKind, TutorToolRuntime>>(() => initialSession.toolRuntime);
  const [sessionContext, setSessionContext] = useState<TutorConversationContext | null>(() => initialSession.context);
  const [pendingUploads, setPendingUploads] = useState<PendingTutorUpload[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<TutorSidebarSection, boolean>>({
    workspace: true,
    materials: false,
    notebook: false,
  });
  const [isQuizConfigOpen, setIsQuizConfigOpen] = useState(false);
  const [questionCountInput, setQuestionCountInput] = useState('10');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const notebookSectionRef = useRef<HTMLElement | null>(null);
  const streamedReplyRef = useRef('');
  const frameRef = useRef<number | null>(null);
  const processedCompanionIntentRef = useRef<string | null>(null);
  const knownDocumentIdsRef = useRef<Set<string>>(new Set());

  const documentsQuery = useQuery({
    queryKey: ['ai-tutor', 'documents', userId ?? 'anon'],
    enabled: Boolean(userId),
    queryFn: fetchTutorDocuments,
    staleTime: 30_000,
  });

  const createDocumentMutation = useMutation({
    mutationFn: createTutorDocument,
    onSuccess: (document) => {
      queryClient.setQueryData<TutorDocument[]>(['ai-tutor', 'documents', userId ?? 'anon'], (current) => {
        const next = current ? current.filter((item) => item.id !== document.id) : [];
        return [document, ...next];
      });
      setSelectedDocumentIds((current) => (current.includes(document.id) ? current : [...current, document.id]));
      setNotice({ tone: 'success', text: copy.aiTutor.materialUploaded });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: deleteTutorDocument,
    onSuccess: (_data, documentId) => {
      queryClient.setQueryData<TutorDocument[]>(['ai-tutor', 'documents', userId ?? 'anon'], (current) =>
        (current ?? []).filter((document) => document.id !== documentId),
      );
      setSelectedDocumentIds((current) => current.filter((id) => id !== documentId));
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: createQuizFromDocs,
  });

  const suggestedPrompts = useMemo(() => personaCopy.prompts, [personaCopy.prompts]);
  const toolDefinitions = useMemo<
    Record<
      TutorToolKind,
      {
        label: string;
        ariaLabel: string;
        icon: LucideIcon;
        tones: string;
      }
    >
  >(
    () => ({
      mindmap: {
        label: copy.aiTutor.mindMap,
        ariaLabel: language === 'zh-CN' ? '生成思维导图' : 'Generate mind map',
        icon: GitBranch,
        tones: 'border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]',
      },
      report: {
        label: copy.aiTutor.report,
        ariaLabel: language === 'zh-CN' ? '生成报告' : 'Generate report',
        icon: FileText,
        tones: 'border-[#ead2af] bg-[#fbf3e6] text-[#9a6f3f]',
      },
      quiz: {
        label: copy.aiTutor.quiz,
        ariaLabel: language === 'zh-CN' ? '配置并创建测验课程' : 'Configure and create quiz course',
        icon: BadgeHelp,
        tones: 'border-[#ead2af] bg-[#f8efdf] text-[#9c7342]',
      },
      presentation: {
        label: copy.aiTutor.presentation,
        ariaLabel: language === 'zh-CN' ? '生成演示' : 'Generate presentation',
        icon: Sparkles,
        tones: 'border-[#dbcde3] bg-[#f3edf7] text-[#7f6f88]',
      },
    }),
    [copy.aiTutor.mindMap, copy.aiTutor.presentation, copy.aiTutor.quiz, copy.aiTutor.report, language],
  );

  const transcript = messages.slice(1);
  const hasStartedConversation = transcript.length > 0;
  const hasToolInFlight = TOOL_ORDER.some((kind) => toolRuntime[kind].status === 'loading');
  const documents = documentsQuery.data ?? EMPTY_TUTOR_DOCUMENTS;
  const documentsErrorMessage = documentsQuery.error
    ? resolveTutorErrorMessage(documentsQuery.error, copy.common.errorFallback, copy.aiTutor.materialsUnavailable)
    : null;
  const selectedDocumentCount = selectedDocumentIds.length;
  const questionCount = Number.parseInt(questionCountInput, 10);
  const isQuestionCountValid = Number.isInteger(questionCount) && questionCount >= 5 && questionCount <= 30;

  const notebookItems = useMemo(
    () =>
      TOOL_ORDER.map((kind) => ({ kind, runtime: toolRuntime[kind], definition: toolDefinitions[kind] }))
        .filter((item) => item.runtime.status !== 'idle')
        .sort((left, right) => (right.runtime.updatedAt ?? 0) - (left.runtime.updatedAt ?? 0)),
    [toolDefinitions, toolRuntime],
  );

  const revealNotebookSection = useCallback(() => {
    setExpandedSections((current) => (current.notebook ? current : { ...current, notebook: true }));
    window.requestAnimationFrame(() => {
      const notebookElement = notebookSectionRef.current;
      if (notebookElement && typeof notebookElement.scrollIntoView === 'function') {
        notebookElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }, []);

  const openNotebookItem = useCallback(
    (itemModal: TutorToolModal | null) => {
      if (!itemModal) {
        return;
      }
      if (itemModal.kind === 'quiz') {
        navigate(`/course/${itemModal.payload.courseId}`);
        return;
      }
      setModal(itemModal);
    },
    [navigate],
  );

  const toggleSection = useCallback((section: TutorSidebarSection) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }, []);

  function flushStreamedReply(force = false) {
    const apply = () => {
      frameRef.current = null;
      const nextText = streamedReplyRef.current;
      setMessages((current) => replaceLastModelMessage(current, nextText));
    };

    if (force) {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      apply();
      return;
    }

    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = window.requestAnimationFrame(apply);
  }

  const openTool = useCallback(
    async (kind: TutorToolKind, historyOverride?: TutorMessage[]) => {
      if (kind === 'quiz') {
        if (!userId) {
          setNotice({ tone: 'error', text: copy.aiTutor.materialsProtected });
          return;
        }
        if (documentsErrorMessage) {
          setNotice({ tone: 'error', text: documentsErrorMessage });
          return;
        }
        setIsQuizConfigOpen(true);
        return;
      }

      const toolLabel = toolDefinitions[kind].label;
      const toolHistory = historyOverride ?? messages;
      setToolRuntime((current) => ({
        ...current,
        [kind]: {
          ...current[kind],
          status: 'loading',
          errorMessage: null,
        },
      }));
      setNotice({
        tone: 'info',
        text: language === 'zh-CN' ? `正在生成${toolLabel}…` : `Generating ${toolLabel.toLowerCase()}…`,
      });

      try {
        await bootstrapGeminiKey();

        let nextModal: TutorToolModal;
        if (kind === 'mindmap') {
          nextModal = { kind, payload: await generateMindMap(toolHistory) };
        } else if (kind === 'presentation') {
          nextModal = { kind, payload: await generatePresentation(toolHistory) };
        } else {
          const reportPrompt = buildStudyReportPrompt(language, sessionContext?.courseTitle);
          const reportBody = await generateTutorReply([...toolHistory, { role: 'user', text: reportPrompt }]);
          nextModal = {
            kind,
            payload: {
              title:
                language === 'zh-CN'
                  ? sessionContext?.courseTitle
                    ? `《${sessionContext.courseTitle}》学习报告`
                    : copy.aiTutor.report
                  : sessionContext?.courseTitle
                    ? `"${sessionContext.courseTitle}" ${copy.aiTutor.report}`
                    : copy.aiTutor.report,
              body: reportBody,
            },
          };
        }

        setToolRuntime((current) => ({
          ...current,
          [kind]: {
            status: 'success',
            modal: nextModal,
            updatedAt: Date.now(),
            errorMessage: null,
          },
        }));
        setModal(nextModal);
        setNotice({
          tone: 'info',
          text:
            kind === 'report'
              ? copy.aiTutor.reportReady
              : language === 'zh-CN'
                ? `${toolLabel}已更新，可在右侧继续查看。`
                : `${toolLabel} updated. Reopen it from the workspace.`,
        });
        captureViewerEvent('viewer_ai_tutor_tool_opened', { kind });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : copy.aiTutor.missingKey;
        setToolRuntime((current) => {
          const existing = current[kind];
          return {
            ...current,
            [kind]: {
              ...existing,
              status: existing.modal ? 'success' : 'error',
              errorMessage,
            },
          };
        });
        setNotice({ tone: 'error', text: errorMessage });
        captureViewerError(error, { area: 'ai_tutor_tool', kind });
      }
    },
    [copy.aiTutor.materialsProtected, copy.aiTutor.missingKey, copy.aiTutor.report, copy.aiTutor.reportReady, documentsErrorMessage, language, messages, sessionContext, toolDefinitions, userId],
  );

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    if (trimmed.startsWith('/apikey ')) {
      await persistGeminiKey(trimmed.replace('/apikey', '').trim());
      setNotice({ tone: 'success', text: copy.aiTutor.apiKeyStored });
      setInput('');
      captureViewerEvent('viewer_ai_tutor_key_overridden');
      return;
    }

    const userMessage: TutorMessage = { role: 'user', text: trimmed };
    const requestHistory = [...messages, userMessage];
    streamedReplyRef.current = '';
    setMessages((current) => [...current, userMessage, { role: 'model', text: '' }]);
    setInput('');
    setNotice({ tone: 'info', text: copy.aiTutor.responsePreparing });
    setIsSending(true);

    try {
      captureViewerEvent('viewer_ai_tutor_message_sent', { length: trimmed.length });
      const result = await generateTutorReplyStream(requestHistory, {
        onToken(token) {
          streamedReplyRef.current += token;
          flushStreamedReply();
        },
        onFinal(payload) {
          streamedReplyRef.current = payload.reply;
          flushStreamedReply(true);
          captureViewerEvent('viewer_ai_tutor_stream_completed', {
            toolCount: payload.usedTools.length,
          });
        },
      });
      if (!result.reply.trim()) {
        throw new Error('AI Tutor returned an empty response.');
      }
      setNotice(null);
    } catch (error) {
      setMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        if (last?.role === 'model' && !last.text.trim()) {
          next.pop();
        }
        return next;
      });
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : copy.aiTutor.missingKey });
      captureViewerError(error, { area: 'ai_tutor_reply' });
    } finally {
      if (streamedReplyRef.current) {
        flushStreamedReply(true);
      }
      setIsSending(false);
    }
  }

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) {
        return;
      }

      if (!userId) {
        setNotice({ tone: 'error', text: copy.aiTutor.materialsProtected });
        return;
      }

      for (const file of Array.from(files)) {
        const pendingId = `pending-${crypto.randomUUID()}`;
        setPendingUploads((current) => [...current, { id: pendingId, filename: file.name, mimeType: file.type }]);

        try {
          const extracted = await extractTutorDocumentText(file);
          await createDocumentMutation.mutateAsync({
            filename: file.name,
            mimeType: extracted.mimeType,
            extractedText: extracted.text,
          });
        } catch (error) {
          setNotice({
            tone: 'error',
            text: resolveTutorErrorMessage(error, copy.common.errorFallback, copy.aiTutor.materialsUnavailable),
          });
          captureViewerError(error, { area: 'ai_tutor_document_upload', fileName: file.name });
        } finally {
          setPendingUploads((current) => current.filter((item) => item.id !== pendingId));
        }
      }
    },
    [copy.aiTutor.materialsProtected, copy.aiTutor.materialsUnavailable, copy.common.errorFallback, createDocumentMutation, userId],
  );

  const handleDeleteDocument = useCallback(
    async (document: TutorDocument) => {
      try {
        await deleteDocumentMutation.mutateAsync(document.id);
      } catch (error) {
        setNotice({
          tone: 'error',
          text: resolveTutorErrorMessage(error, copy.common.errorFallback, copy.aiTutor.materialsUnavailable),
        });
        captureViewerError(error, { area: 'ai_tutor_document_delete', documentId: document.id });
      }
    },
    [copy.aiTutor.materialsUnavailable, copy.common.errorFallback, deleteDocumentMutation],
  );

  const handleCreateQuizCourse = useCallback(async () => {
    if (documentsErrorMessage) {
      setNotice({ tone: 'error', text: documentsErrorMessage });
      return;
    }

    if (!selectedDocumentIds.length) {
      setNotice({ tone: 'error', text: documents.length ? copy.aiTutor.quizRequiresMaterials : copy.aiTutor.quizRequiresUpload });
      return;
    }

    if (pendingUploads.length) {
      setNotice({ tone: 'error', text: copy.aiTutor.quizPendingUploads });
      return;
    }

    if (!isQuestionCountValid) {
      setNotice({ tone: 'error', text: copy.common.errorFallback });
      return;
    }

    setToolRuntime((current) => ({
      ...current,
      quiz: {
        ...current.quiz,
        status: 'loading',
        updatedAt: Date.now(),
        errorMessage: null,
      },
    }));
    setIsQuizConfigOpen(false);
    revealNotebookSection();
    setNotice({ tone: 'info', text: copy.aiTutor.quizPreparing });

    try {
      const result = await createQuizMutation.mutateAsync({
        documentIds: selectedDocumentIds,
        questionCount,
      });

      const quizArtifact: TutorToolModal = {
        kind: 'quiz',
        payload: {
          courseId: result.courseId,
          courseTitle: result.courseTitle,
          questionCount,
          sourceDocumentIds: selectedDocumentIds,
        },
      };

      setToolRuntime((current) => {
        const next = {
          ...current,
          quiz: {
            status: 'success' as const,
            modal: quizArtifact,
            updatedAt: Date.now(),
            errorMessage: null,
          },
        };
        persistAiTutorSession({ messages, toolRuntime: next, context: sessionContext });
        return next;
      });

      setNotice({ tone: 'success', text: copy.aiTutor.quizCreated });
      captureViewerEvent('viewer_ai_tutor_quiz_course_created', {
        courseId: result.courseId,
        questionCount,
        sourceCount: selectedDocumentIds.length,
      });
    } catch (error) {
      const errorMessage = resolveQuizErrorMessage(
        error,
        copy.common.errorFallback,
        copy.aiTutor.materialsUnavailable,
        copy.aiTutor.quizUnavailable,
      );
      setToolRuntime((current) => {
        const existing = current.quiz;
        return {
          ...current,
          quiz: {
            ...existing,
            status: existing.modal ? 'success' : 'error',
            errorMessage,
          },
        };
      });
      setNotice({ tone: 'error', text: errorMessage });
      captureViewerError(error, { area: 'ai_tutor_quiz_course_create' });
    }
  }, [copy.aiTutor.materialsUnavailable, copy.aiTutor.quizCreated, copy.aiTutor.quizPendingUploads, copy.aiTutor.quizPreparing, copy.aiTutor.quizRequiresMaterials, copy.aiTutor.quizRequiresUpload, copy.aiTutor.quizUnavailable, copy.common.errorFallback, createQuizMutation, documents.length, documentsErrorMessage, isQuestionCountValid, messages, pendingUploads.length, questionCount, revealNotebookSection, selectedDocumentIds, sessionContext]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.role !== 'model') {
        return current;
      }
      if (current[0].text === personaCopy.welcomeBody) {
        return current;
      }
      return defaultTutorMessages(personaCopy.welcomeBody);
    });
  }, [personaCopy.welcomeBody]);

  useEffect(() => {
    persistAiTutorSession({ messages, toolRuntime, context: sessionContext });
  }, [messages, sessionContext, toolRuntime]);

  useEffect(() => {
    const currentIds = new Set(documents.map((document) => document.id));
    setSelectedDocumentIds((current) => {
      const next = current.filter((id) => currentIds.has(id));
      documents.forEach((document) => {
        if (!knownDocumentIdsRef.current.has(document.id)) {
          next.push(document.id);
        }
      });
      const deduped = [...new Set(next)];
      if (deduped.length === current.length && deduped.every((id, index) => id === current[index])) {
        return current;
      }
      return deduped;
    });
    knownDocumentIdsRef.current = currentIds;
  }, [documents]);

  useEffect(() => {
    const source = searchParams.get('source');
    const intent = searchParams.get('intent');
    const courseTitle = searchParams.get('courseTitle');

    if (source !== 'home-companion' || (intent !== 'quiz' && intent !== 'mindmap')) {
      return;
    }

    const intentKey = searchParams.toString();
    if (processedCompanionIntentRef.current === intentKey) {
      return;
    }
    processedCompanionIntentRef.current = intentKey;

    setSessionContext({
      source: 'home-companion',
      courseTitle: courseTitle?.trim() || null,
    });

    if (intent === 'quiz') {
      setNotice({
        tone: 'info',
        text: copy.aiTutor.quizRequiresUpload,
      });
      navigate('/ai-tutor', { replace: true });
      return;
    }

    const seededPrompt = buildCompanionToolPrompt(language, intent, courseTitle);
    const seededHistory: TutorMessage[] = [
      { role: 'model', text: personaCopy.welcomeBody },
      { role: 'user', text: seededPrompt },
    ];

    setMessages(seededHistory);
    setNotice({
      tone: 'info',
      text: language === 'zh-CN' ? '正在为当前课程生成思维导图…' : 'Preparing a mind map for the current course…',
    });

    void openTool(intent, seededHistory);
    navigate('/ai-tutor', { replace: true });
  }, [copy.aiTutor.quizRequiresUpload, language, navigate, openTool, personaCopy.welcomeBody, searchParams]);

  useEffect(() => {
    if (!documentsErrorMessage) {
      return;
    }

    setExpandedSections((current) => (current.materials ? current : { ...current, materials: true }));
  }, [documentsErrorMessage]);

  const noticeToneClass =
    notice?.tone === 'success'
      ? 'viewer-botanical-notice--success'
      : notice?.tone === 'error'
        ? 'viewer-botanical-notice--error'
        : 'viewer-botanical-notice--info';
  const workspaceToggleLabel = expandedSections.workspace ? copy.aiTutor.collapseWorkspace : copy.aiTutor.expandWorkspace;
  const materialsToggleLabel = expandedSections.materials ? copy.aiTutor.collapseMaterials : copy.aiTutor.expandMaterials;
  const notebookToggleLabel = expandedSections.notebook ? copy.aiTutor.collapseNotebook : copy.aiTutor.expandNotebook;
  const sectionToggleButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd3c3] bg-[rgba(255,252,247,0.86)] text-[#6f6359] transition hover:border-[#d1c4b4] hover:bg-[#fffaf2]';

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-[90%] max-w-[1380px] flex-col overflow-hidden px-0 pt-0"
      style={{
        minHeight: 'calc(100% + var(--viewer-dock-content-gap) - var(--viewer-dock-height) - var(--viewer-dock-offset))',
        marginBottom: 'calc(var(--viewer-dock-height) + var(--viewer-dock-offset) - var(--viewer-dock-content-gap))',
      }}
    >
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.78fr)_304px]">
        <section className="flex min-h-0 flex-col overflow-hidden bg-transparent">
          <div className="min-h-0 flex-1 overflow-hidden px-5 pb-4 pt-0 md:px-6 md:pb-5">
            <div className="flex h-full min-h-0 flex-col gap-4">
              {!hasStartedConversation ? (
                <>
                  <div className="rounded-[26px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.96)_0%,rgba(247,242,231,0.88)_100%)] px-5 py-5 shadow-[0_14px_32px_rgba(90,70,50,0.08)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-[3.45rem] w-[3.45rem] shrink-0 items-center justify-center rounded-[18px] border border-[#e4d2b6] bg-[linear-gradient(145deg,#f4ddbc_0%,#d4b896_100%)] text-white shadow-[0_10px_24px_rgba(196,149,106,0.2)]">
                        <Bot size={28} />
                      </div>
                      <div>
                        <p className="viewer-botanical-eyebrow">{copy.aiTutor.deskEyebrow}</p>
                        <h1
                          className="mt-4 text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
                          style={{ fontFamily: '"Cormorant Garamond", serif' }}
                        >
                          {personaCopy.welcomeTitle}
                        </h1>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 space-y-2.5">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="flex w-full items-center rounded-[20px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] px-4 py-3.5 text-left text-[0.86rem] font-semibold text-[#4d4239] shadow-[0_8px_18px_rgba(90,70,50,0.05)] transition hover:border-[#d2c5b2] hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() => void handleSend(prompt)}
                        disabled={isSending}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="min-h-0 flex-1" />
                </>
              ) : (
                <div className="viewer-scrollbar-hidden min-h-0 flex-1 overflow-auto pr-1">
                  <div className="space-y-3 rounded-[22px] border border-[#e2d7c9] bg-[rgba(255,250,245,0.84)] p-4">
                    {transcript.map((message, index) => {
                      const isPendingModel =
                        isSending && index === transcript.length - 1 && message.role === 'model' && !message.text.trim();
                      return (
                        <div
                          key={`${message.role}-${index}`}
                          className={
                            message.role === 'user'
                              ? 'ml-auto max-w-[82%] rounded-[20px] border border-[#b9d1bc] bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] px-4 py-3 text-[0.88rem] font-medium leading-6 text-white shadow-[0_12px_24px_rgba(122,158,126,0.2)]'
                              : 'max-w-[82%] rounded-[20px] border border-[#e2d7c9] bg-[rgba(255,252,247,0.92)] px-4 py-3 text-[0.88rem] font-medium leading-6 text-[#4d4239] shadow-[0_10px_24px_rgba(90,70,50,0.08)]'
                          }
                        >
                          {isPendingModel ? (language === 'zh-CN' ? '正在思考…' : 'Thinking…') : message.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 space-y-3 px-5 pb-0 pt-0 md:px-6">
            <div className="flex items-center gap-3 rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-3.5 py-2.5 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
              <PenLine size={19} className="text-[#9a8d82]" />
              <input
                aria-label={copy.aiTutor.placeholder}
                className="min-w-0 flex-1 border-0 bg-transparent text-[0.92rem] font-semibold text-[#3d342a] outline-none placeholder:text-[#a9968a]"
                placeholder={copy.aiTutor.placeholder}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSend(input);
                  }
                }}
              />
              <button
                type="button"
                aria-label={copy.aiTutor.send}
                className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void handleSend(input)}
                disabled={isSending}
              >
                <SendHorizontal size={22} />
              </button>
            </div>
            {notice ? (
              <div className={`viewer-botanical-notice ${noticeToneClass}`}>{notice.text}</div>
            ) : null}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden">
          <div className="viewer-scrollbar-hidden min-h-0 flex-1 overflow-auto pr-1">
            <div className="space-y-3">
              <section
                ref={notebookSectionRef}
                className="rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-4 shadow-[0_10px_24px_rgba(90,70,50,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className="text-[2.1rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
                    style={{ fontFamily: '"Cormorant Garamond", serif' }}
                  >
                    {language === 'zh-CN' ? '工作台' : 'Workspace'}
                  </h2>
                  <button
                    type="button"
                    aria-label={workspaceToggleLabel}
                    aria-expanded={expandedSections.workspace}
                    aria-controls={expandedSections.workspace ? 'ai-tutor-workspace-panel' : undefined}
                    className={sectionToggleButtonClass}
                    onClick={() => toggleSection('workspace')}
                    title={workspaceToggleLabel}
                  >
                    {expandedSections.workspace ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {expandedSections.workspace ? (
                  <div id="ai-tutor-workspace-panel" className="mt-3 grid grid-cols-2 gap-2.5">
                    {TOOL_ORDER.map((kind) => {
                      const definition = toolDefinitions[kind];
                      const runtime = toolRuntime[kind];
                      const ToolIcon = definition.icon;
                      const subtitle =
                        runtime.status === 'loading'
                          ? copy.aiTutor.generating
                          : runtime.status === 'error'
                            ? runtime.errorMessage || copy.aiTutor.failed
                            : runtime.modal
                              ? kind === 'quiz'
                                ? copy.aiTutor.quizReady
                                : copy.aiTutor.generatedReady
                              : kind === 'quiz'
                                ? copy.aiTutor.quizRequiresUpload
                                : copy.aiTutor.notebook.pending;

                      return (
                        <button
                          key={kind}
                          type="button"
                          aria-label={definition.ariaLabel}
                          className={`rounded-[20px] border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${definition.tones}`}
                          onClick={() => void openTool(kind)}
                          disabled={isSending || hasToolInFlight || (kind === 'quiz' && (createQuizMutation.isPending || Boolean(documentsErrorMessage)))}
                        >
                          <ToolIcon size={16} />
                          <div className="mt-6 text-[0.82rem] font-bold">{definition.label}</div>
                          <div className="mt-1 text-[0.72rem] font-medium opacity-80">{subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>

              <section className="rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-4 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className="text-[1.8rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
                      style={{ fontFamily: '"Cormorant Garamond", serif' }}
                    >
                      {copy.aiTutor.materials}
                    </h3>
                    <div className="mt-1 text-[0.74rem] font-medium text-[#8b7d72]">
                      {userId
                        ? interpolateCount(copy.aiTutor.materialsSelected, selectedDocumentCount)
                        : copy.aiTutor.materialsProtected}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="sr-only"
                      aria-label={copy.aiTutor.uploadMaterials}
                      multiple
                      accept=".pdf,.docx,.ppt,.pptx,.doc"
                      onChange={(event) => {
                        void handleUploadFiles(event.target.files);
                        event.currentTarget.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="viewer-botanical-button viewer-botanical-button--secondary px-3 py-2 text-[0.76rem]"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!userId || pendingUploads.length > 0 || createDocumentMutation.isPending || Boolean(documentsErrorMessage)}
                    >
                      <span className="flex items-center gap-2">
                        <Upload size={15} />
                        {copy.aiTutor.uploadMaterials}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={materialsToggleLabel}
                      aria-expanded={expandedSections.materials}
                      aria-controls={expandedSections.materials ? 'ai-tutor-materials-panel' : undefined}
                      className={sectionToggleButtonClass}
                      onClick={() => toggleSection('materials')}
                      title={materialsToggleLabel}
                    >
                      {expandedSections.materials ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {expandedSections.materials ? (
                  <div id="ai-tutor-materials-panel" className="viewer-scrollbar-hidden mt-3 max-h-[240px] overflow-auto pr-1">
                    {documentsErrorMessage ? (
                      <div className="rounded-[18px] border border-[#efc8c8] bg-[rgba(255,245,245,0.92)] px-4 py-4 text-[0.78rem] font-medium leading-6 text-[#8b4a4a]">
                        {documentsErrorMessage}
                      </div>
                    ) : documentsQuery.isLoading ? (
                      <div className="rounded-[18px] border border-dashed border-[#ddcfbe] px-4 py-4 text-[0.78rem] font-medium text-[#8b7d72]">
                        {copy.aiTutor.materialsLoading}
                      </div>
                    ) : documents.length || pendingUploads.length ? (
                      <div className="space-y-2.5">
                        {pendingUploads.map((upload) => (
                          <div
                            key={upload.id}
                            className="flex items-center gap-3 rounded-[18px] border border-[#e1d7c8] bg-[rgba(255,252,247,0.88)] px-3.5 py-3 shadow-[0_8px_18px_rgba(90,70,50,0.05)]"
                          >
                            <LoaderCircle size={17} className="animate-spin text-[#8b7d72]" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[0.82rem] font-bold text-[#3d342a]">{upload.filename}</div>
                              <div className="mt-1 text-[0.74rem] font-medium text-[#8b7d72]">
                                {formatDocumentType(upload)} · {copy.aiTutor.materialUploading}
                              </div>
                            </div>
                          </div>
                        ))}
                        {documents.map((document) => {
                          const checked = selectedDocumentIds.includes(document.id);
                          return (
                            <label
                              key={document.id}
                              className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-[#e1d7c8] bg-[rgba(255,252,247,0.88)] px-3.5 py-3 shadow-[0_8px_18px_rgba(90,70,50,0.05)]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setSelectedDocumentIds((current) =>
                                    current.includes(document.id)
                                      ? current.filter((id) => id !== document.id)
                                      : [...current, document.id],
                                  );
                                }}
                                className="h-4 w-4 rounded border-[#cdbda8] text-[#7a9e7e] focus:ring-[#7a9e7e]"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[0.82rem] font-bold text-[#3d342a]">{document.filename}</div>
                                <div className="mt-1 text-[0.74rem] font-medium text-[#8b7d72]">
                                  {formatDocumentType(document)} · {interpolateCount(copy.aiTutor.materialChars, document.extracted_chars)}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#e1d7c8] bg-white/70 text-[#9d8e82] transition hover:border-[#d0c0ad] hover:text-[#6e5f54] disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`${copy.aiTutor.deleteMaterial} ${document.filename}`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void handleDeleteDocument(document);
                                }}
                                disabled={deleteDocumentMutation.isPending}
                              >
                                <Trash2 size={15} />
                              </button>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-[#ddcfbe] px-4 py-4 text-center shadow-[0_8px_18px_rgba(90,70,50,0.04)]">
                        <div className="text-[0.82rem] font-bold text-[#4d4239]">{copy.aiTutor.materialsEmptyTitle}</div>
                        <div className="mt-2 text-[0.74rem] font-medium leading-6 text-[#8b7d72]">{copy.aiTutor.materialsEmptyBody}</div>
                      </div>
                    )}
                  </div>
                ) : null}
              </section>

              <section className="rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-4 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className="text-[1.8rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
                    style={{ fontFamily: '"Cormorant Garamond", serif' }}
                  >
                    {language === 'zh-CN' ? '笔记本' : 'Notebook'}
                  </h3>
                  <button
                    type="button"
                    aria-label={notebookToggleLabel}
                    aria-expanded={expandedSections.notebook}
                    aria-controls={expandedSections.notebook ? 'ai-tutor-notebook-panel' : undefined}
                    className={sectionToggleButtonClass}
                    onClick={() => toggleSection('notebook')}
                    title={notebookToggleLabel}
                  >
                    {expandedSections.notebook ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {expandedSections.notebook ? (
                  <div id="ai-tutor-notebook-panel" className="mt-3">
                    {notebookItems.length ? (
                      <div className="space-y-2.5">
                        {notebookItems.map(({ kind, runtime, definition }) => {
                          const ToolIcon = definition.icon;
                          const isPendingQuiz = kind === 'quiz' && runtime.status === 'loading';
                          const canOpen = Boolean(runtime.modal) && runtime.status !== 'loading';
                          const showRetry = runtime.status === 'error';
                          const isClickableQuizCard = kind === 'quiz' && canOpen && !showRetry;
                          const statusText =
                            isPendingQuiz
                              ? copy.aiTutor.quizGeneratingBody
                              : runtime.status === 'loading'
                              ? copy.aiTutor.generating
                              : runtime.status === 'error'
                                ? runtime.errorMessage || copy.aiTutor.failed
                                : kind === 'quiz'
                                  ? copy.aiTutor.quizReady
                                  : copy.aiTutor.generatedReady;
                          const titleText = isPendingQuiz
                            ? copy.aiTutor.quizGeneratingTitle
                            : artifactTitle(runtime.modal, definition.label);
                          const cardClassName =
                            isPendingQuiz
                              ? 'rounded-[20px] border border-[#d6e2d5] bg-[linear-gradient(180deg,rgba(255,253,249,0.98)_0%,rgba(245,250,244,0.95)_100%)] px-4 py-4 text-left shadow-[0_12px_24px_rgba(90,70,50,0.06)]'
                              : 'rounded-[18px] border border-[#e1d7c8] bg-[rgba(255,252,247,0.88)] px-3.5 py-3 text-left shadow-[0_8px_18px_rgba(90,70,50,0.05)]';

                          const cardContent = (
                            <div className="flex items-start gap-3">
                              <div
                                className={
                                  isPendingQuiz
                                    ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#edf4ec] text-[#4f7655]'
                                    : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#f3efe8] text-[#8a7764]'
                                }
                              >
                                {isPendingQuiz ? <LoaderCircle size={21} className="animate-spin" /> : <ToolIcon size={17} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={isPendingQuiz ? 'text-[0.96rem] font-bold leading-tight text-[#35523a]' : 'text-[0.84rem] font-bold text-[#3d342a]'}>
                                  {titleText}
                                </div>
                                <div className={isPendingQuiz ? 'mt-1 text-[0.8rem] font-medium text-[#6f7f70]' : 'mt-1 text-[0.76rem] font-medium text-[#8b7d72]'}>
                                  {statusText}
                                </div>
                              </div>
                              {showRetry ? (
                                <button
                                  type="button"
                                  className="viewer-botanical-button viewer-botanical-button--secondary px-3 py-1.5 text-[0.72rem]"
                                  onClick={() => void openTool(kind)}
                                >
                                  {copy.aiTutor.retryGeneration}
                                </button>
                              ) : canOpen && !isClickableQuizCard ? (
                                <button
                                  type="button"
                                  className="viewer-botanical-button viewer-botanical-button--secondary px-3 py-1.5 text-[0.72rem]"
                                  onClick={() => openNotebookItem(runtime.modal)}
                                >
                                  {copy.aiTutor.openLatest}
                                </button>
                              ) : canOpen ? null : (
                                <span className="text-[0.72rem] font-semibold text-[#9d8e82]">{copy.aiTutor.generating}</span>
                              )}
                            </div>
                          );

                          if (isClickableQuizCard) {
                            return (
                              <button
                                key={`${kind}-${runtime.updatedAt ?? runtime.status}`}
                                type="button"
                                className={`block w-full transition hover:border-[#d1dbc9] hover:shadow-[0_14px_28px_rgba(90,70,50,0.08)] ${cardClassName}`}
                                onClick={() => openNotebookItem(runtime.modal)}
                              >
                                {cardContent}
                              </button>
                            );
                          }

                          return (
                            <div
                              key={`${kind}-${runtime.updatedAt ?? runtime.status}`}
                              className={cardClassName}
                            >
                              {cardContent}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-[20px] border border-dashed border-[#ddcfbe] bg-[rgba(255,252,247,0.74)] px-4 py-4 text-center shadow-[0_8px_18px_rgba(90,70,50,0.04)]">
                        <div className="text-[0.86rem] font-bold text-[#4d4239]">{copy.aiTutor.noArtifactsTitle}</div>
                        <div className="mt-2 text-[0.76rem] font-medium leading-6 text-[#8b7d72]">{copy.aiTutor.noArtifactsBody}</div>
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </aside>
      </div>

      <Suspense fallback={null}>
        {modal ? (
          <AiTutorToolDialog
            modal={modal}
            onClose={() => setModal(null)}
            closeLabel={copy.aiTutor.closeDialog}
            kindLabel={toolDefinitions[modal.kind].label}
          />
        ) : null}
      </Suspense>

      {isQuizConfigOpen ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-[rgba(61,52,42,0.38)] px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="viewer-surface w-full max-w-md bg-[rgba(254,250,245,0.96)] p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.aiTutor.quiz}</p>
                <h2
                  className="mt-2 text-[2rem] font-semibold text-[var(--viewer-text)]"
                  style={{ fontFamily: '"Cormorant Garamond", serif' }}
                >
                  {copy.aiTutor.quizConfigTitle}
                </h2>
              </div>
              <button
                type="button"
                className="viewer-botanical-button viewer-botanical-button--secondary"
                onClick={() => setIsQuizConfigOpen(false)}
              >
                {copy.common.cancel}
              </button>
            </div>

            <p className="mt-4 text-[0.84rem] font-medium leading-7 text-[#6f6156]">{copy.aiTutor.quizConfigBody}</p>
            <p className="mt-3 text-[0.76rem] font-semibold text-[#8b7d72]">
              {interpolateCount(copy.aiTutor.materialsSelected, selectedDocumentCount)}
            </p>

            <div className="mt-5">
              <label className="text-[0.82rem] font-bold text-[#4d4239]" htmlFor="ai-tutor-question-count">
                {copy.aiTutor.questionCount}
              </label>
              <input
                id="ai-tutor-question-count"
                type="number"
                min={5}
                max={30}
                step={1}
                inputMode="numeric"
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3 text-[0.9rem] font-semibold text-[#3d342a] outline-none"
                value={questionCountInput}
                onChange={(event) => setQuestionCountInput(event.target.value)}
              />
            </div>

            <div className="mt-5 text-[0.74rem] font-medium leading-6 text-[#8b7d72]">
              {!selectedDocumentCount
                ? documents.length
                  ? copy.aiTutor.quizRequiresMaterials
                  : copy.aiTutor.quizRequiresUpload
                : pendingUploads.length
                  ? copy.aiTutor.quizPendingUploads
                  : isQuestionCountValid
                    ? null
                    : copy.common.errorFallback}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="viewer-botanical-button viewer-botanical-button--secondary"
                onClick={() => setIsQuizConfigOpen(false)}
              >
                {copy.common.cancel}
              </button>
              <button
                type="button"
                className="viewer-botanical-button viewer-botanical-button--primary"
                onClick={() => void handleCreateQuizCourse()}
                disabled={Boolean(documentsErrorMessage) || !selectedDocumentCount || pendingUploads.length > 0 || !isQuestionCountValid || createQuizMutation.isPending}
              >
                {copy.aiTutor.createQuizCourse}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
