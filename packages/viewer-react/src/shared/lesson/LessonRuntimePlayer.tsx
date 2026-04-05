import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { computeBlockVisibility, isQuestionBlock, seedCorrectState } from '@/shared/lesson/blockVisibility';
import { LearnerBlockRenderer } from '@/shared/lesson/LearnerBlockRenderer';
import type { LessonRuntimeData } from '@/shared/lesson/types';
import { viewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';

export type LessonCompletionSummary = {
  correctCount: number;
  totalCount: number;
  pageCount: number;
};

export function buildLessonCompletionSummary(recordedResults: Record<string, boolean>, pageCount: number) {
  const values = Object.values(recordedResults);
  return {
    correctCount: values.filter(Boolean).length,
    totalCount: values.length,
    pageCount,
  } satisfies LessonCompletionSummary;
}

export function LessonRuntimePlayer({
  data,
  onExit,
  onComplete,
}: {
  data: LessonRuntimeData;
  onExit: () => void;
  onComplete: (summary: LessonCompletionSummary) => void;
}) {
  const pages = useMemo(() => [...data.pages].sort((a, b) => a.order - b.order), [data.pages]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [checked, setChecked] = useState(false);
  const [checkVersion, setCheckVersion] = useState(0);
  const [recordedResults, setRecordedResults] = useState<Record<string, boolean>>({});

  const page = pages[currentPageIndex];
  const blocks = useMemo(
    () => [...(page?.blocks ?? [])].sort((a, b) => a.position.order - b.position.order),
    [page],
  );
  const [correctState, setCorrectState] = useState<Record<string, boolean>>(() => seedCorrectState(blocks));

  useEffect(() => {
    setChecked(false);
    setCheckVersion(0);
    setCorrectState(seedCorrectState(blocks));
  }, [page?.page_id, blocks]);

  const pageCount = pages.length;
  const pageNumber = pageCount > 0 ? currentPageIndex + 1 : 0;
  const isLastPage = currentPageIndex >= Math.max(pageCount - 1, 0);
  const hasQuestionBlocks = blocks.some((block) => isQuestionBlock(block));
  const visibility = computeBlockVisibility(blocks, correctState, checked);

  const summary = useMemo(() => {
    return buildLessonCompletionSummary(recordedResults, pageCount);
  }, [recordedResults, pageCount]);

  return (
    <div className="space-y-6">
      <section className="viewer-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--viewer-border)] bg-[rgba(247,242,231,0.88)] px-5 py-4">
          <div>
            <p className="viewer-botanical-eyebrow text-[0.7rem]">Learner desk</p>
            <p className="mt-1 text-sm font-semibold text-[var(--viewer-text)]">
              {pageCount > 0 ? `Page ${pageNumber} of ${pageCount}` : 'No pages yet'}
            </p>
          </div>
          <button
            type="button"
            className="viewer-botanical-button viewer-botanical-button--secondary"
            onClick={onExit}
          >
            {viewerCopy.lesson.exit}
          </button>
        </div>

        <div className="space-y-6 px-5 py-6">
          {pages.length > 1 ? (
            <div className="flex flex-wrap gap-2" aria-label="Page progress">
              {pages.map((candidate, index) => (
                <button
                  key={candidate.page_id}
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition',
                    index === currentPageIndex
                      ? 'border-[#b9d1bc] bg-[#edf5ec] text-[#5c7d60]'
                      : 'border-[var(--viewer-border)] bg-[rgba(255,252,247,0.75)] text-[var(--viewer-text-muted)]',
                  )}
                  onClick={() => setCurrentPageIndex(index)}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  <span>{`Page ${index + 1}`}</span>
                </button>
              ))}
            </div>
          ) : null}

          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="viewer-botanical-eyebrow text-[0.72rem]">Lesson preview</p>
              <h2 className="viewer-botanical-heading text-[2.65rem] leading-none">{data.title}</h2>
              <p className="text-sm font-medium text-[var(--viewer-text-muted)]">
                {pageCount > 0 ? `Page ${pageNumber}${pageCount > 1 ? ` of ${pageCount}` : ''} inside the learner runtime.` : 'No content yet.'}
              </p>
            </div>
            <span className="viewer-botanical-pill border-[#e2d5c2] bg-[#fbf7f0] text-[#8b7153]">
              <Eye size={14} />
              Live learner view
            </span>
          </header>

          {blocks.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[var(--viewer-border)] bg-[rgba(255,252,247,0.78)] p-10 text-center text-sm font-medium text-[var(--viewer-text-muted)]">
              No blocks on this page yet.
            </div>
          ) : (
            <div className="space-y-5">
              {blocks.map((block, index) =>
                visibility[index] ? (
                  <div key={block.id} className="viewer-surface bg-[rgba(255,252,247,0.88)] p-5">
                    <LearnerBlockRenderer
                      block={block}
                      checkVersion={checkVersion}
                      onAnswered={(isCorrect) => {
                        setCorrectState((current) =>
                          current[block.id] === isCorrect ? current : { ...current, [block.id]: isCorrect },
                        );
                        setRecordedResults((current) =>
                          current[block.id] === isCorrect ? current : { ...current, [block.id]: isCorrect },
                        );
                      }}
                    />
                  </div>
                ) : null,
              )}
            </div>
          )}

          <footer className="flex flex-col gap-4 border-t border-[var(--viewer-border)] pt-4 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              className="viewer-botanical-button viewer-botanical-button--secondary disabled:opacity-40"
              onClick={() => setCurrentPageIndex((index) => Math.max(index - 1, 0))}
              disabled={currentPageIndex === 0}
            >
              <ArrowLeft size={16} />
              {viewerCopy.lesson.prev}
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              {hasQuestionBlocks ? (
                <button
                  type="button"
                  className="viewer-botanical-button viewer-botanical-button--warm"
                  onClick={() => {
                    setChecked(true);
                    setCheckVersion((value) => value + 1);
                  }}
                >
                  {viewerCopy.lesson.check}
                </button>
              ) : null}

              <button
                type="button"
                className="viewer-botanical-button viewer-botanical-button--primary"
                onClick={() => {
                  if (isLastPage) {
                    onComplete(summary);
                    return;
                  }
                  setCurrentPageIndex((index) => Math.min(index + 1, pageCount - 1));
                }}
              >
                {isLastPage ? viewerCopy.lesson.complete : viewerCopy.lesson.next}
                {!isLastPage ? <ArrowRight size={16} /> : null}
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
