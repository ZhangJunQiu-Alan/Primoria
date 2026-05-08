import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, NotebookPen, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { generateTutorReplyStream, type TutorMessage } from '@/shared/api/geminiClient';
import { TutorMarkdown } from '@/shared/ai-tutor/TutorMarkdown';
import type { CommunityNote } from '@/shared/api/viewer/types';
import { LearnerBlockRenderer } from '@/shared/lesson/LearnerBlockRenderer';
import { buildLessonAiContext } from '@/shared/lesson/lessonAiContext';
import { isBlockVisibleInPublishedCourse } from '@/shared/lesson/blockVisibility';
import {
  buildRecordedResults,
  buildWrongReviewItems,
  deriveLessonPageState,
  ensureLessonPageSession,
  stepLessonPageSession,
  updateQuestionResponse,
  type LessonWrongReviewItem,
  type LessonPageSessionState,
} from '@/shared/lesson/questionFlow';
import type { LessonRuntimeData } from '@/shared/lesson/types';
import { viewerLanguageToLocale } from '@/shared/i18n/locale';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useViewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';

export type LessonCompletionSummary = {
  correctCount: number;
  totalCount: number;
  pageCount: number;
  wrongReviewItems: LessonWrongReviewItem[];
};

export function buildLessonCompletionSummary(
  recordedResults: Record<string, boolean>,
  pageCount: number,
  wrongReviewItems: LessonWrongReviewItem[] = [],
) {
  const values = Object.values(recordedResults);
  return {
    correctCount: values.filter(Boolean).length,
    totalCount: values.length,
    pageCount,
    wrongReviewItems,
  } satisfies LessonCompletionSummary;
}

export function LessonRuntimePlayer({
  data,
  onExit,
  onComplete,
  lessonNote,
  lessonNoteLoading = false,
  lessonNoteSaving = false,
  onSaveNote,
}: {
  data: LessonRuntimeData;
  onExit: () => void;
  onComplete: (summary: LessonCompletionSummary) => void;
  lessonNote: CommunityNote | null;
  lessonNoteLoading?: boolean;
  lessonNoteSaving?: boolean;
  onSaveNote: (body: string) => Promise<unknown> | void;
}) {
  const language = useProductLanguage();
  const copy = useViewerCopy();
  const pageEntries = useMemo(
    () =>
      [...data.pages]
        .sort((a, b) => a.order - b.order)
        .map((page) => ({
          page,
          blocks: [...page.blocks]
            .sort((a, b) => a.position.order - b.position.order)
            .filter((block) => isBlockVisibleInPublishedCourse(block)),
        })),
    [data.pages],
  );
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSessions, setPageSessions] = useState<Record<string, LessonPageSessionState>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteDraftBody, setNoteDraftBody] = useState('');
  const [noteDraftDirty, setNoteDraftDirty] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<TutorMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSending, setAiSending] = useState(false);
  const aiMessagesRef = useRef<TutorMessage[]>([]);
  const aiScrollRef = useRef<HTMLDivElement | null>(null);
  const aiInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    aiMessagesRef.current = aiMessages;
  }, [aiMessages]);

  useEffect(() => {
    setCurrentPageIndex((index) => Math.min(index, Math.max(pageEntries.length - 1, 0)));
  }, [pageEntries.length]);

  useEffect(() => {
    setCurrentPageIndex(0);
    setPageSessions({});
    setNotesOpen(false);
    setNoteDraftBody('');
    setNoteDraftDirty(false);
    setAiOpen(false);
    setAiMessages([]);
    setAiInput('');
    setAiError(null);
    setAiSending(false);
  }, [data.lessonId]);

  useEffect(() => {
    if (!notesOpen || noteDraftDirty) {
      return;
    }

    setNoteDraftBody(lessonNote?.body ?? '');
  }, [lessonNote?.body, notesOpen, noteDraftDirty]);

  useEffect(() => {
    if ((!notesOpen && !aiOpen) || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [aiOpen, notesOpen]);

  useEffect(() => {
    if (!aiOpen) {
      return;
    }

    const container = aiScrollRef.current;
    if (!container) {
      return;
    }

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [aiMessages, aiOpen, aiSending]);

  useEffect(() => {
    const input = aiInputRef.current;
    if (!input) {
      return;
    }

    input.style.height = '0px';
    const nextHeight = Math.min(Math.max(input.scrollHeight, 24), 120);
    input.style.height = `${nextHeight}px`;
  }, [aiInput, aiOpen]);

  const currentEntry = pageEntries[currentPageIndex];
  const page = currentEntry?.page;
  const blocks = currentEntry?.blocks ?? [];
  const pageCount = pageEntries.length;
  const isLastPage = currentPageIndex >= Math.max(pageCount - 1, 0);
  const pageSession = useMemo(
    () => (page ? ensureLessonPageSession(blocks, pageSessions[page.page_id]) : ensureLessonPageSession([])),
    [blocks, page, pageSessions],
  );
  const pageState = useMemo(
    () => deriveLessonPageState(blocks, pageSession, { isLastPage }),
    [blocks, isLastPage, pageSession],
  );
  const summary = useMemo(() => {
    const orderedPages = pageEntries.map(({ page: lessonPage, blocks: lessonBlocks }) => ({
      page_id: lessonPage.page_id,
      blocks: lessonBlocks,
    }));
    return buildLessonCompletionSummary(
      buildRecordedResults(orderedPages, pageSessions),
      pageCount,
      buildWrongReviewItems(orderedPages, pageSessions),
    );
  }, [pageCount, pageEntries, pageSessions]);
  const currentQuestionBlockId = pageState.currentQuestion?.blockId ?? null;

  const lessonAiContext = useMemo(
    () =>
      buildLessonAiContext({
        data,
        currentPageIndex,
        blocks,
        pageSession,
        pageState,
        locale: viewerLanguageToLocale(language),
        blockId: currentQuestionBlockId,
      }),
    [blocks, currentPageIndex, currentQuestionBlockId, data, language, pageSession, pageState],
  );

  const primaryButtonLabel = pageState.primaryAction === 'complete-lesson' ? copy.lesson.complete : copy.lesson.check;
  const primaryButtonDisabled = pageState.primaryAction === 'disabled';

  function updateCurrentPageSession(
    updater: (session: LessonPageSessionState) => LessonPageSessionState,
  ) {
    if (!page) {
      return;
    }

    setPageSessions((current) => {
      const base = ensureLessonPageSession(blocks, current[page.page_id]);
      return {
        ...current,
        [page.page_id]: updater(base),
      };
    });
  }

  function canAccessPage(index: number) {
    if (index < 0 || index >= pageEntries.length) {
      return false;
    }

    return pageEntries.slice(0, index).every(({ page: candidate, blocks: candidateBlocks }) =>
      deriveLessonPageState(
        candidateBlocks,
        ensureLessonPageSession(candidateBlocks, pageSessions[candidate.page_id]),
        { isLastPage: false },
      ).canAdvancePage,
    );
  }

  function goToPage(index: number) {
    if (!canAccessPage(index)) {
      return;
    }

    setCurrentPageIndex(index);
  }

  function openNotes() {
    if (lessonNoteLoading) {
      return;
    }

    setAiOpen(false);
    setAiError(null);
    setNoteDraftBody(lessonNote?.body ?? '');
    setNoteDraftDirty(false);
    setNotesOpen(true);
  }

  function closeNotes() {
    if (noteDraftDirty && noteDraftBody.trim()) {
      void onSaveNote(noteDraftBody);
    }

    setNotesOpen(false);
    setNoteDraftDirty(false);
  }

  function openAi() {
    if (notesOpen) {
      closeNotes();
    }
    setAiError(null);
    setAiOpen(true);
  }

  function closeAi() {
    setAiOpen(false);
    setAiInput('');
    setAiError(null);
  }

  function resetAi() {
    setAiMessages([]);
    setAiInput('');
    setAiError(null);
    setAiSending(false);
  }

  function updateStreamingReply(mode: 'append' | 'replace', text: string) {
    setAiMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (!last || last.role !== 'model') {
        next.push({ role: 'model', text: mode === 'replace' ? text : text });
        return next;
      }

      next[next.length - 1] = {
        ...last,
        text: mode === 'replace' ? text : `${last.text}${text}`,
      };
      return next;
    });
  }

  async function handleAiSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmed = aiInput.trim();
    if (!trimmed || aiSending) {
      return;
    }

    const userMessage: TutorMessage = { role: 'user', text: trimmed };
    const requestHistory = [...aiMessagesRef.current, userMessage];
    setAiMessages((current) => [...current, userMessage, { role: 'model', text: '' }]);
    setAiInput('');
    setAiError(null);
    setAiSending(true);

    try {
      const result = await generateTutorReplyStream(
        requestHistory,
        {
          onToken(token) {
            updateStreamingReply('append', token);
          },
          onFinal(payload) {
            updateStreamingReply('replace', payload.reply);
          },
        },
        {
          model: 'gemini-2.5-flash',
          allowModelFallback: false,
          context: lessonAiContext,
        },
      );

      if (!result.reply.trim()) {
        throw new Error(language === 'zh-CN' ? 'AI 没有返回有效内容。' : 'AI returned an empty reply.');
      }
    } catch (error) {
      setAiMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        if (last?.role === 'model' && !last.text.trim()) {
          next.pop();
        }
        return next;
      });
      setAiError(error instanceof Error ? error.message : copy.common.errorFallback);
    } finally {
      setAiSending(false);
    }
  }

  function handlePrimaryAction() {
    switch (pageState.primaryAction) {
      case 'evaluate-question':
      case 'next-question':
        updateCurrentPageSession((current) => stepLessonPageSession(blocks, current));
        return;
      case 'next-page':
        goToPage(currentPageIndex + 1);
        return;
      case 'complete-lesson':
        onComplete(summary);
        return;
      default:
        return;
    }
  }

  return (
    <div className="flex h-full flex-col pb-[calc(var(--viewer-dock-content-gap)+env(safe-area-inset-bottom))]">
      <section className="viewer-surface flex min-h-full flex-1 flex-col overflow-hidden">
        <div className="grid grid-cols-[auto_1fr] items-center gap-4 border-b border-[var(--viewer-border)] bg-[rgba(247,242,231,0.88)] px-5 py-4">
          <button
            type="button"
            aria-label={copy.lesson.exit}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] text-[var(--viewer-text)] shadow-[0_10px_20px_rgba(90,70,50,0.08)] transition hover:-translate-y-0.5 hover:bg-white"
            onClick={onExit}
          >
            <X size={22} />
          </button>

          <div
            className="flex items-center justify-center gap-3"
            aria-label={language === 'zh-CN' ? '页面进度' : 'Page progress'}
          >
            {pageEntries.map((candidate, index) => (
              <span
                key={candidate.page.page_id}
                data-testid="lesson-progress-dot"
                data-state={index === currentPageIndex ? 'active' : 'inactive'}
                className={cn(
                  'block h-3 w-3 rounded-full transition-all',
                  index === currentPageIndex
                    ? 'w-8 bg-[#74bdf0] shadow-[0_0_0_4px_rgba(116,189,240,0.16)]'
                    : 'bg-[rgba(141,124,105,0.24)]',
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pt-6">
          <div className="flex-1 space-y-6 pb-6">
            {blocks.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[var(--viewer-border)] bg-[rgba(255,252,247,0.78)] p-10 text-center text-sm font-medium text-[var(--viewer-text-muted)]">
                {language === 'zh-CN' ? '这一页还没有内容区块。' : 'No blocks on this page yet.'}
              </div>
            ) : (
              <div className="space-y-5">
                {blocks.map((block, index) =>
                  pageState.visibleBlockIndexes.has(index) ? (
                    <div key={block.id} className="viewer-surface bg-[rgba(255,252,247,0.88)] p-5">
                      <LearnerBlockRenderer
                        block={block}
                        response={pageSession.responses[block.id]}
                        evaluation={pageSession.evaluations[block.id]}
                        locked={
                          !(
                            block.id === currentQuestionBlockId &&
                            pageSession.phase === 'answering' &&
                            !pageSession.pageCompleted
                          )
                        }
                        onResponseChange={
                          block.id === currentQuestionBlockId &&
                          pageSession.phase === 'answering' &&
                          !pageSession.pageCompleted
                            ? (response) =>
                                updateCurrentPageSession((current) =>
                                  updateQuestionResponse(blocks, current, block.id, response),
                                )
                            : undefined
                        }
                      />
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>

        </div>
      </section>

      <div
        data-testid="lesson-action-bar"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(var(--viewer-dock-offset)+env(safe-area-inset-bottom))] md:px-6"
      >
        <div className="flex w-full max-w-6xl items-end gap-3">
          <div className="grid flex-1 grid-cols-5 gap-3">
            <button
              type="button"
              className="viewer-botanical-button viewer-botanical-button--lesson-prev col-span-1 min-w-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => goToPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
            >
              <ArrowLeft size={16} />
              {copy.lesson.prev}
            </button>

            <button
              type="button"
              className="viewer-botanical-button viewer-botanical-button--ai col-span-2 min-w-0 whitespace-nowrap"
              onClick={openAi}
            >
              <Sparkles size={16} />
              {copy.lesson.askAi}
            </button>

            <button
              type="button"
              className="viewer-botanical-button viewer-botanical-button--lesson-next col-span-2 min-w-0 whitespace-nowrap disabled:cursor-not-allowed"
              disabled={primaryButtonDisabled}
              onClick={handlePrimaryAction}
            >
              {primaryButtonLabel}
              {pageState.primaryAction !== 'complete-lesson' ? <ArrowRight size={16} /> : null}
            </button>
          </div>

          <button
            data-testid="lesson-note-trigger"
            type="button"
            aria-label={copy.community.addNote}
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.96)] text-[var(--viewer-text)] shadow-[0_14px_28px_rgba(90,70,50,0.1)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
            onClick={openNotes}
            disabled={lessonNoteLoading}
          >
            <NotebookPen size={22} />
          </button>
        </div>
      </div>

      {notesOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              data-testid="lesson-note-backdrop"
              className="fixed inset-0 z-[90] flex items-end bg-[rgba(44,37,29,0.52)]"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeNotes();
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="lesson-note-title"
                className="w-full rounded-t-[32px] border border-[var(--viewer-border)] bg-[rgba(254,250,245,0.98)] shadow-[0_-18px_40px_rgba(44,37,29,0.18)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[var(--viewer-border)] px-6 py-5">
                  <h2 id="lesson-note-title" className="text-[1.8rem] font-black tracking-[-0.03em] text-[var(--viewer-text)]">
                    {language === 'zh-CN' ? '笔记' : 'Notes'}
                  </h2>
                  <button
                    type="button"
                    aria-label={language === 'zh-CN' ? '关闭笔记' : 'Close notes'}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.9)] text-[var(--viewer-text)] transition hover:bg-white"
                    onClick={closeNotes}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.76)] px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--viewer-text-muted)]">
                      {language === 'zh-CN' ? '当前课时' : 'Current lesson'}
                    </p>
                    <p className="mt-2 text-lg font-black text-[var(--viewer-text)]">{data.title}</p>
                  </div>

                  <textarea
                    data-testid="lesson-note-textarea"
                    className="min-h-48 w-full rounded-[24px] border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] px-5 py-4 text-base font-medium leading-7 text-[var(--viewer-text)] outline-none transition focus:border-[#b9d1bc] focus:ring-2 focus:ring-[#dceadc]"
                    value={noteDraftBody}
                    onChange={(event) => {
                      setNoteDraftBody(event.target.value);
                      setNoteDraftDirty(true);
                    }}
                    placeholder={language === 'zh-CN' ? '写下这节课的笔记…' : 'Write a note...'}
                    disabled={lessonNoteLoading}
                  />

                  {lessonNoteSaving ? (
                    <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">
                      {language === 'zh-CN' ? '正在保存笔记…' : 'Saving note…'}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {aiOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              data-testid="lesson-ai-backdrop"
              className="fixed inset-0 z-[90] flex items-end bg-[rgba(44,37,29,0.52)]"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeAi();
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={copy.lesson.askAi}
                className="flex h-[50vh] w-full flex-col rounded-t-[32px] border border-[var(--viewer-border)] bg-[rgba(254,250,245,0.98)] shadow-[0_-18px_40px_rgba(44,37,29,0.18)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-end px-6 py-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={language === 'zh-CN' ? '重置问AI' : 'Reset Ask AI'}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.9)] text-[var(--viewer-text)] transition hover:bg-white"
                      onClick={resetAi}
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label={language === 'zh-CN' ? '关闭问AI' : 'Close Ask AI'}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.9)] text-[var(--viewer-text)] transition hover:bg-white"
                      onClick={closeAi}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div ref={aiScrollRef} className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
                  {aiMessages.length === 0 && !aiError ? (
                    <div className="flex-1" />
                  ) : (
                    <div className="space-y-4">
                  {aiMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn(
                        'max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-7',
                        message.role === 'user'
                          ? 'ml-auto bg-[#eef4ff] text-[#395279]'
                          : 'border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.8)] text-[var(--viewer-text)]',
                      )}
                    >
                      {message.text ? (
                        <TutorMarkdown text={message.text} className="leading-7" />
                      ) : aiSending && message.role === 'model' ? (
                        copy.lesson.aiThinking
                      ) : (
                        ''
                      )}
                    </div>
                  ))}
                    </div>
                  )}

                  {aiError ? (
                    <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {aiError}
                    </div>
                  ) : null}
                  </div>
                </div>

                <form className="px-6 pb-5 pt-2" onSubmit={handleAiSubmit}>
                  <div className="mx-auto max-w-5xl rounded-[26px] border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.9)] px-4 py-2.5 shadow-[0_10px_26px_rgba(90,70,50,0.08)]">
                    <div className="flex items-center gap-3">
                      <textarea
                        ref={aiInputRef}
                        data-testid="lesson-ai-input"
                        rows={1}
                        className="min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-0 text-base font-medium leading-6 text-[var(--viewer-text)] outline-none"
                        value={aiInput}
                        onChange={(event) => setAiInput(event.target.value)}
                        placeholder={copy.lesson.aiPlaceholder}
                        disabled={aiSending}
                      />
                      <button
                        data-testid="lesson-ai-send"
                        type="submit"
                        aria-label={copy.aiTutor.send}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#d9c6b3] bg-[linear-gradient(180deg,#fff8ee,#efe0ce)] text-[#9d8a78] shadow-[0_6px_0_rgba(210,193,173,0.95),0_14px_20px_rgba(90,70,50,0.08)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#fff9f1,#f4e4d2)] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!aiInput.trim() || aiSending}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
