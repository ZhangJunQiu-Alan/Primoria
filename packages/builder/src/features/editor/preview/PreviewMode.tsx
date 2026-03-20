import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { useAppSelector } from '@/store';
import { computeBlockVisibility, isQuestionBlock, seedCorrectState } from '../blockVisibility';
import { LearnerBlockRenderer } from './LearnerBlockRenderer';

interface PreviewModeProps {
  lessonId: string;
  pageId: string;
  onSelectPage?: (pageId: string) => void;
}

/** Full learner-view preview of the active page, rendered inside the editor. */
export function PreviewMode({ lessonId, pageId, onSelectPage }: PreviewModeProps) {
  const draft = useAppSelector((s) => s.editor.draft);
  const lesson = draft?.lessons.find((l) => l.lesson_id === lessonId);
  const pages = lesson?.pages ?? [];
  const selectedPageIndex = Math.max(
    0,
    pages.findIndex((candidate) => candidate.page_id === pageId),
  );
  const [currentPageIndex, setCurrentPageIndex] = useState(selectedPageIndex);

  useEffect(() => {
    setCurrentPageIndex(selectedPageIndex);
  }, [selectedPageIndex]);

  const page = pages[currentPageIndex];
  const blocks = page?.blocks ?? [];
  const sorted = [...blocks].sort((a, b) => a.position.order - b.position.order);
  const [checked, setChecked] = useState(false);
  const [checkVersion, setCheckVersion] = useState(0);
  const [correctState, setCorrectState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(false);
    setCheckVersion(0);
    setCorrectState(seedCorrectState(sorted));
  }, [page?.page_id, blocks]);

  const hasQuestionBlocks = sorted.some((block) => isQuestionBlock(block));
  const blockVisibility = computeBlockVisibility(sorted, correctState, checked);
  const isLastPage = currentPageIndex >= Math.max(pages.length - 1, 0);
  const pageCount = pages.length;
  const pageNumber = pageCount > 0 ? currentPageIndex + 1 : 0;
  const lessonTitle = lesson?.title?.trim() || 'Untitled lesson';

  function goToPage(index: number) {
    const nextPage = pages[index];
    if (!nextPage) return;
    setCurrentPageIndex(index);
    onSelectPage?.(nextPage.page_id);
  }

  return (
    <div className="editor-preview-mode">
      <div className="editor-preview-mode__scroll">
        <section className="editor-preview-stage-shell">
          <div className="editor-preview-stage-frame">
            <div className="editor-preview-stage-frame__bar">
              <span className="editor-preview-stage-frame__label">Desktop preview</span>
              <span className="editor-preview-stage-frame__status">
                {pageCount > 0 ? `Page ${pageNumber} of ${pageCount}` : 'No pages yet'}
              </span>
            </div>

            {pages.length > 1 ? (
              <div className="editor-preview-progress" aria-label="Page progress">
                {pages.map((candidate, index) => (
                  <button
                    key={candidate.page_id}
                    type="button"
                    className={`editor-preview-progress__step ${
                      index === currentPageIndex ? 'is-active' : ''
                    }`}
                    onClick={() => goToPage(index)}
                    aria-label={`Go to page ${index + 1}`}
                    aria-current={index === currentPageIndex ? 'page' : undefined}
                  >
                    <span className="editor-preview-progress__step-dot" aria-hidden />
                    <span className="editor-preview-progress__step-text">Page {index + 1}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="editor-preview-stage">
              <header className="editor-preview-stage__header">
                <div>
                  <p className="editor-preview-stage__eyebrow">Lesson preview</p>
                  <h2 className="editor-preview-stage__title">{lessonTitle}</h2>
                  <p className="editor-preview-stage__subtitle">
                    {pageCount > 0
                      ? `Page ${pageNumber}${pageCount > 1 ? ` of ${pageCount}` : ''} rendered in the learner shell.`
                      : 'Add a page to start the learner preview flow.'}
                  </p>
                </div>
                <span className="editor-preview-pill editor-preview-pill--sage">
                  <Eye className="h-4 w-4" />
                  Live learner view
                </span>
              </header>

              <div className="editor-preview-stage__body">
                {sorted.length === 0 ? (
                  <div className="editor-preview-empty">
                    <p className="editor-preview-empty__title">No blocks on this page</p>
                    <p className="editor-preview-empty__body">
                      Add content blocks in the builder, then return here to preview the learner
                      flow.
                    </p>
                  </div>
                ) : (
                  <div className="editor-preview-stage__blocks">
                    {sorted.map((block, index) =>
                      blockVisibility[index] ? (
                        <LearnerBlockRenderer
                          key={block.id}
                          block={block}
                          checkVersion={checkVersion}
                          onAnswered={(isCorrect) =>
                            setCorrectState((current) =>
                              current[block.id] === isCorrect
                                ? current
                                : { ...current, [block.id]: isCorrect },
                            )
                          }
                        />
                      ) : null,
                    )}
                  </div>
                )}
              </div>

              {sorted.length > 0 ? (
                <footer className="editor-preview-stage__footer">
                  <button
                    type="button"
                    className="editor-preview-action editor-preview-action--secondary"
                    onClick={() => goToPage(currentPageIndex - 1)}
                    disabled={currentPageIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Prev
                  </button>

                  <div className="editor-preview-stage__footer-actions">
                    {hasQuestionBlocks ? (
                      <button
                        type="button"
                        className="editor-preview-action editor-preview-action--warm"
                        onClick={() => {
                          setChecked(true);
                          setCheckVersion((current) => current + 1);
                        }}
                      >
                        Check
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="editor-preview-action editor-preview-action--primary"
                      onClick={() => goToPage(currentPageIndex + 1)}
                      disabled={isLastPage}
                    >
                      {isLastPage ? 'Complete' : 'Next'}
                      {!isLastPage ? <ArrowRight className="h-4 w-4" /> : null}
                    </button>
                  </div>
                </footer>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
