import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeHelp, GitBranch, type LucideIcon } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import {
  createMindMapFromDocs,
  createQuizFromDocs,
  listMindMaps,
} from '@/shared/api/viewer/tutorDocumentsApi';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import {
  persistAiTutorSession,
  resolveMindMapErrorMessage,
  resolveQuizErrorMessage,
  TOOL_ORDER,
} from '@/features/ai-tutor/aiTutorUtils';
import type {
  ActiveToolConfig,
  AiTutorCopyLike,
  TutorConversationContext,
  TutorStatusNotice,
  TutorToolKind,
  TutorToolRuntime,
} from '@/features/ai-tutor/aiTutorTypes';
import type { MindMapSummary, QuizOutputLanguage } from '@/shared/api/viewer/types';
import type { TutorMessage } from '@/shared/api/geminiClient';
import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';

export function useAiTutorTools({
  userId,
  copy,
  language,
  initialToolRuntime,
  selectedDocumentIds,
  pendingUploadsCount,
  documentsCount,
  documentsErrorMessage,
  messages,
  sessionContext,
  setNotice,
  navigate,
}: {
  userId: string | undefined;
  copy: AiTutorCopyLike;
  language: 'zh-CN' | 'en';
  initialToolRuntime: Record<TutorToolKind, TutorToolRuntime>;
  selectedDocumentIds: string[];
  pendingUploadsCount: number;
  documentsCount: number;
  documentsErrorMessage: string | null;
  messages: TutorMessage[];
  sessionContext: TutorConversationContext | null;
  setNotice: (notice: TutorStatusNotice | null) => void;
  navigate: NavigateFunction;
}) {
  const queryClient = useQueryClient();
  const [toolRuntime, setToolRuntime] = useState<Record<TutorToolKind, TutorToolRuntime>>(() => initialToolRuntime);
  const [expandedSections, setExpandedSections] = useState({
    workspace: true,
    materials: false,
    notebook: false,
  });
  const [activeToolConfig, setActiveToolConfig] = useState<ActiveToolConfig>(null);
  const [questionCountInput, setQuestionCountInput] = useState('10');
  const [quizLanguage, setQuizLanguage] = useState<QuizOutputLanguage>('en');
  const [mindMapPromptInput, setMindMapPromptInput] = useState('');
  const notebookSectionRef = useRef<HTMLElement | null>(null);

  const mindMapsQuery = useQuery({
    queryKey: ['ai-tutor', 'mindmaps', userId ?? 'anon'],
    enabled: Boolean(userId),
    queryFn: listMindMaps,
    staleTime: 30_000,
  });

  const createQuizMutation = useMutation({
    mutationFn: createQuizFromDocs,
  });

  const createMindMapMutation = useMutation({
    mutationFn: createMindMapFromDocs,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-tutor', 'mindmaps', userId ?? 'anon'] });
    },
  });

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
        ariaLabel: language === 'zh-CN' ? '配置并生成思维导图' : 'Configure and generate mind map',
        icon: GitBranch,
        tones: 'border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]',
      },
      quiz: {
        label: copy.aiTutor.quiz,
        ariaLabel: language === 'zh-CN' ? '配置并创建测验课程' : 'Configure and create quiz course',
        icon: BadgeHelp,
        tones: 'border-[#ead2af] bg-[#f8efdf] text-[#9c7342]',
      },
    }),
    [copy.aiTutor.mindMap, copy.aiTutor.quiz, language],
  );

  const hasToolInFlight = TOOL_ORDER.some((kind) => toolRuntime[kind].status === 'loading');
  const mindMaps = mindMapsQuery.data ?? ([] as MindMapSummary[]);
  const latestMindMap = mindMaps[0] ?? null;
  const questionCount = Number.parseInt(questionCountInput, 10);
  const isQuestionCountValid = Number.isInteger(questionCount) && questionCount >= 5 && questionCount <= 30;
  const mindMapPrompt = mindMapPromptInput.trim();
  const notebookItems = useMemo(
    () =>
      TOOL_ORDER.filter((kind) => kind !== 'mindmap')
        .map((kind) => ({ kind, runtime: toolRuntime[kind], definition: toolDefinitions[kind] }))
        .filter((item) => item.runtime.status !== 'idle')
        .sort((left, right) => (right.runtime.updatedAt ?? 0) - (left.runtime.updatedAt ?? 0)),
    [toolDefinitions, toolRuntime],
  );
  const mindMapRuntime = toolRuntime.mindmap;
  const showMindMapNotebookRuntime = mindMapRuntime.status === 'loading' || mindMapRuntime.status === 'error';
  const hasNotebookContent = showMindMapNotebookRuntime || mindMaps.length > 0 || notebookItems.length > 0;

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
      if (itemModal?.kind === 'quiz') {
        navigate(`/course/${itemModal.payload.courseId}`);
      }
    },
    [navigate],
  );

  const openMindMapNotebookItem = useCallback((mindMapId: string) => {
    const targetUrl = new URL(`/ai-tutor/mindmap/${mindMapId}`, window.location.origin).toString();
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const toggleSection = useCallback((section: 'workspace' | 'materials' | 'notebook') => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }, []);

  const openTool = useCallback(
    (kind: TutorToolKind) => {
      if (!userId) {
        setNotice({ tone: 'error', text: copy.aiTutor.materialsProtected });
        return;
      }
      if (documentsErrorMessage) {
        setNotice({ tone: 'error', text: documentsErrorMessage });
        return;
      }

      setExpandedSections((current) => (current.materials ? current : { ...current, materials: true }));
      setActiveToolConfig({ kind });
    },
    [copy.aiTutor.materialsProtected, documentsErrorMessage, setNotice, userId],
  );

  const closeActiveToolConfig = useCallback(() => {
    setActiveToolConfig(null);
  }, []);

  const syncToolRuntime = useCallback(
    (next: Record<TutorToolKind, TutorToolRuntime>) => {
      persistAiTutorSession({ messages, toolRuntime: next, context: sessionContext });
      setToolRuntime(next);
    },
    [messages, sessionContext],
  );

  const handleCreateMindMap = useCallback(async () => {
    if (documentsErrorMessage) {
      setNotice({ tone: 'error', text: documentsErrorMessage });
      return;
    }

    if (!selectedDocumentIds.length) {
      setNotice({
        tone: 'error',
        text: documentsCount ? copy.aiTutor.quizRequiresMaterials : copy.aiTutor.mindMapRequiresUpload,
      });
      return;
    }

    if (pendingUploadsCount) {
      setNotice({ tone: 'error', text: copy.aiTutor.quizPendingUploads });
      return;
    }

    setToolRuntime((current) => ({
      ...current,
      mindmap: {
        ...current.mindmap,
        status: 'loading',
        updatedAt: Date.now(),
        errorMessage: null,
      },
    }));
    setActiveToolConfig(null);
    revealNotebookSection();
    setNotice({ tone: 'info', text: copy.aiTutor.mindMapPreparing });

    try {
      const result = await createMindMapMutation.mutateAsync({
        documentIds: selectedDocumentIds,
        prompt: mindMapPrompt || undefined,
      });

      const mindMapArtifact: TutorToolModal = {
        kind: 'mindmap',
        payload: {
          title: result.title,
          root: result.root,
          sourceDocumentIds: [...selectedDocumentIds],
          userPrompt: mindMapPrompt,
        },
      };

      syncToolRuntime({
        ...toolRuntime,
        mindmap: {
          status: 'success',
          modal: mindMapArtifact,
          updatedAt: Date.now(),
          errorMessage: null,
        },
      });

      setNotice({ tone: 'success', text: copy.aiTutor.mindMapCreated });
      captureViewerEvent('viewer_ai_tutor_mindmap_created', {
        sourceCount: selectedDocumentIds.length,
        promptLength: mindMapPrompt.length,
      });
    } catch (error) {
      const errorMessage = resolveMindMapErrorMessage(
        error,
        copy.common.errorFallback,
        copy.aiTutor.materialsUnavailable,
        copy.aiTutor.mindMapUnavailable,
      );
      setToolRuntime((current) => {
        const existing = current.mindmap;
        return {
          ...current,
          mindmap: {
            ...existing,
            status: existing.modal ? 'success' : 'error',
            errorMessage,
          },
        };
      });
      setNotice({ tone: 'error', text: errorMessage });
      captureViewerError(error, { area: 'ai_tutor_mindmap_create' });
    }
  }, [copy.aiTutor.materialsUnavailable, copy.aiTutor.mindMapCreated, copy.aiTutor.mindMapPreparing, copy.aiTutor.mindMapRequiresUpload, copy.aiTutor.mindMapUnavailable, copy.aiTutor.quizPendingUploads, copy.aiTutor.quizRequiresMaterials, copy.common.errorFallback, createMindMapMutation, documentsCount, documentsErrorMessage, mindMapPrompt, pendingUploadsCount, revealNotebookSection, selectedDocumentIds, setNotice, syncToolRuntime, toolRuntime]);

  const handleCreateQuizCourse = useCallback(async () => {
    if (documentsErrorMessage) {
      setNotice({ tone: 'error', text: documentsErrorMessage });
      return;
    }

    if (!selectedDocumentIds.length) {
      setNotice({ tone: 'error', text: documentsCount ? copy.aiTutor.quizRequiresMaterials : copy.aiTutor.quizRequiresUpload });
      return;
    }

    if (pendingUploadsCount) {
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
    setActiveToolConfig(null);
    revealNotebookSection();
    setNotice({ tone: 'info', text: copy.aiTutor.quizPreparing });

    try {
      const result = await createQuizMutation.mutateAsync({
        documentIds: selectedDocumentIds,
        questionCount,
        language: quizLanguage,
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

      syncToolRuntime({
        ...toolRuntime,
        quiz: {
          status: 'success',
          modal: quizArtifact,
          updatedAt: Date.now(),
          errorMessage: null,
        },
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
  }, [copy.aiTutor.materialsUnavailable, copy.aiTutor.quizCreated, copy.aiTutor.quizPendingUploads, copy.aiTutor.quizPreparing, copy.aiTutor.quizRequiresMaterials, copy.aiTutor.quizRequiresUpload, copy.aiTutor.quizUnavailable, copy.common.errorFallback, createQuizMutation, documentsCount, documentsErrorMessage, isQuestionCountValid, pendingUploadsCount, questionCount, quizLanguage, revealNotebookSection, selectedDocumentIds, setNotice, syncToolRuntime, toolRuntime]);

  const activeDocsToolKind = activeToolConfig?.kind ?? null;
  const isMindMapConfigOpen = activeDocsToolKind === 'mindmap';
  const isQuizConfigOpen = activeDocsToolKind === 'quiz';
  const docsToolConfigDescription = isMindMapConfigOpen ? copy.aiTutor.mindMapConfigBody : copy.aiTutor.quizConfigBody;
  const docsToolConfigTitle = isMindMapConfigOpen ? copy.aiTutor.mindMapConfigTitle : copy.aiTutor.quizConfigTitle;
  const docsToolConfigLabel = isMindMapConfigOpen ? copy.aiTutor.mindMap : copy.aiTutor.quiz;
  const docsToolValidationMessage = !selectedDocumentIds.length
    ? documentsCount
      ? copy.aiTutor.quizRequiresMaterials
      : isMindMapConfigOpen
        ? copy.aiTutor.mindMapRequiresUpload
        : copy.aiTutor.quizRequiresUpload
    : pendingUploadsCount
      ? copy.aiTutor.quizPendingUploads
      : isQuizConfigOpen && !isQuestionCountValid
        ? copy.common.errorFallback
        : null;
  const isDocsToolSubmitDisabled =
    Boolean(documentsErrorMessage) ||
    !selectedDocumentIds.length ||
    pendingUploadsCount > 0 ||
    (isQuizConfigOpen && !isQuestionCountValid) ||
    createQuizMutation.isPending ||
    createMindMapMutation.isPending;

  return {
    activeDocsToolKind,
    activeToolConfig,
    closeActiveToolConfig,
    createMindMapMutation,
    createQuizMutation,
    docsToolConfigDescription,
    docsToolConfigLabel,
    docsToolConfigTitle,
    docsToolValidationMessage,
    expandedSections,
    handleCreateMindMap,
    handleCreateQuizCourse,
    hasNotebookContent,
    hasToolInFlight,
    isDocsToolSubmitDisabled,
    isMindMapConfigOpen,
    isQuestionCountValid,
    isQuizConfigOpen,
    latestMindMap,
    mindMapPromptInput,
    mindMaps,
    mindMapsQuery,
    notebookItems,
    notebookSectionRef,
    openMindMapNotebookItem,
    openNotebookItem,
    openTool,
    questionCountInput,
    quizLanguage,
    setActiveToolConfig,
    setExpandedSections,
    setMindMapPromptInput,
    setQuestionCountInput,
    setQuizLanguage,
    showMindMapNotebookRuntime,
    toggleSection,
    toolDefinitions,
    toolRuntime,
  };
}
