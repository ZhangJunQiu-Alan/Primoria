import { useState, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { useAppDispatch, useAppSelector } from '@/store';
import { openDraft, addLesson, addPage, addBlock, selectBlock } from '@/store/editorSlice';
import { EditorHeader } from './EditorHeader';
import { BlockCanvas } from './canvas/BlockCanvas';
import { PropertyPanel } from './properties/PropertyPanel';
import { PreviewMode } from './preview/PreviewMode';
import { nanoid } from '@/lib/nanoid';
import { uuid } from '@/lib/uuid';
import { BLOCK_CATEGORIES, BLOCK_META } from './blockRegistry';
import { getDefaultVisibilityRule } from './blockVisibility';
import type { Course } from '@primoria/schema';
import type { BlockType } from '@primoria/schema';
import './editor.css';

interface EditorLayoutProps {
  remoteCourse: Course;
}

export function EditorLayout({ remoteCourse }: EditorLayoutProps) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.editor.draft);
  const previewMode = useAppSelector((s) => s.editor.previewMode);

  useEffect(() => {
    if (draft?.course_id === remoteCourse.course_id) return;
    dispatch(openDraft(remoteCourse));
  }, [dispatch, draft?.course_id, remoteCourse.course_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstLesson = draft?.lessons[0];
  const firstPage = firstLesson?.pages[0];

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    firstLesson?.lesson_id ?? null,
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    firstPage?.page_id ?? null,
  );
  const [libraryQuery, setLibraryQuery] = useState('');
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<(typeof BLOCK_CATEGORIES)[number]['id']>>(
    () => new Set(BLOCK_CATEGORIES.map((category) => category.id)),
  );

  useEffect(() => {
    if (!draft || draft.lessons.length === 0) {
      if (selectedLessonId !== null) setSelectedLessonId(null);
      if (selectedPageId !== null) setSelectedPageId(null);
      return;
    }

    const lesson =
      draft.lessons.find((item) => item.lesson_id === selectedLessonId) ?? draft.lessons[0];
    const page =
      lesson?.pages.find((item) => item.page_id === selectedPageId) ?? lesson?.pages[0];

    if (lesson && lesson.lesson_id !== selectedLessonId) {
      setSelectedLessonId(lesson.lesson_id);
    }

    if (page && page.page_id !== selectedPageId) {
      setSelectedPageId(page.page_id);
    }
  }, [draft, selectedLessonId, selectedPageId]);

  useEffect(() => {
    if (!draft || draft.lessons.length > 0) return;

    const lessonId = uuid();
    const pageId = nanoid();
    dispatch(addLesson({ lessonId, pageId, title: 'Lesson 1' }));
    setSelectedLessonId(lessonId);
    setSelectedPageId(pageId);
  }, [dispatch, draft]);

  const selectedLesson =
    draft?.lessons.find((lesson) => lesson.lesson_id === selectedLessonId) ?? null;
  const selectedPage =
    selectedLesson?.pages.find((page) => page.page_id === selectedPageId) ?? null;

  const librarySections = BLOCK_CATEGORIES.map((category) => {
    const query = libraryQuery.trim().toLowerCase();
    const blocks = (Object.entries(BLOCK_META) as [BlockType, (typeof BLOCK_META)[BlockType]][])
      .filter(([, meta]) => meta.category === category.id)
      .filter(([type, meta]) => {
        if (!query) return true;
        return (
          meta.label.toLowerCase().includes(query) ||
          category.label.toLowerCase().includes(query) ||
          type.toLowerCase().includes(query)
        );
      });

    return {
      ...category,
      blocks,
    };
  }).filter((section) => section.blocks.length > 0);

  function setActiveLocation(lessonId: string, pageId: string) {
    setSelectedLessonId(lessonId);
    setSelectedPageId(pageId);
    dispatch(selectBlock(null));
  }

  function handleAddPage() {
    if (!selectedLessonId || !selectedLesson) return;
    const pageId = nanoid();
    dispatch(addPage({ lessonId: selectedLessonId, pageId }));
    setActiveLocation(selectedLessonId, pageId);
  }

  function handleInsertBlock(type: BlockType) {
    if (!selectedLessonId || !selectedPageId || !selectedPage) return;
    const blockId = nanoid();

    dispatch(
        addBlock({
          lessonId: selectedLessonId,
          pageId: selectedPageId,
          block: {
            id: blockId,
            type,
            position: { order: selectedPage.blocks.length },
            content: BLOCK_META[type].defaultContent,
            visibilityRule: getDefaultVisibilityRule(selectedPage.blocks.length),
          },
        }),
      );

    dispatch(selectBlock(blockId));
  }

  function toggleLibrarySection(sectionId: (typeof BLOCK_CATEGORIES)[number]['id']) {
    setExpandedSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  if (!draft) {
    return (
      <div className="editor-studio">
        <div className="editor-studio__loading">
          <p>Loading editor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-studio">
      <div className="editor-studio__shell">
        <EditorHeader
          activeLessonId={selectedLessonId}
          activePageId={selectedPageId}
          activeLessonTitle={selectedLesson?.title ?? null}
        />

        <div className="editor-studio__body">
          <aside className="editor-panel editor-library" aria-label="Block library">
            <div className="editor-library__header">
              <h2>Block Library</h2>
            </div>

            <label className="editor-library__search">
              <MagnifyingGlassIcon className="h-4 w-4" />
              <input
                type="search"
                placeholder="Search blocks"
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                aria-label="Search blocks"
              />
            </label>

            <div className="editor-library__sections">
              {librarySections.length > 0 ? (
                librarySections.map((section) => (
                  <section key={section.id} className="editor-library__section">
                    <button
                      type="button"
                      className="editor-library__section-toggle"
                      onClick={() => toggleLibrarySection(section.id)}
                      aria-expanded={expandedSectionIds.has(section.id)}
                      aria-controls={`editor-library-section-${section.id}`}
                    >
                      <div className="editor-library__section-header">
                        <h3>{section.label}</h3>
                      </div>
                      <ChevronDownIcon
                        className={`editor-library__section-chevron ${expandedSectionIds.has(section.id) ? 'is-expanded' : ''}`}
                      />
                    </button>
                    {expandedSectionIds.has(section.id) ? (
                      <div
                        id={`editor-library-section-${section.id}`}
                        className="editor-library__block-grid"
                      >
                        {section.blocks.map(([type, meta]) => (
                          <button
                            key={type}
                            type="button"
                            className="editor-library__block"
                            onClick={() => handleInsertBlock(type)}
                            aria-label={`Add ${meta.label}`}
                          >
                            <span className="editor-library__block-mark" aria-hidden>
                              {meta.icon}
                            </span>
                            <span className="editor-library__block-copy">
                              <strong>{meta.label}</strong>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))
              ) : (
                <div className="editor-library__empty">
                  <p>No blocks match “{libraryQuery.trim()}”.</p>
                  <button
                    type="button"
                    className="editor-chip editor-chip--ghost"
                    onClick={() => setLibraryQuery('')}
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </aside>

          {previewMode && selectedLessonId && selectedPageId ? (
            <div className="editor-panel editor-preview-shell">
              <CanvasNavigator
                draft={draft}
                selectedLessonId={selectedLessonId}
                selectedPageId={selectedPageId}
                onSelectPage={(pageId) => setActiveLocation(selectedLessonId, pageId)}
                onAddPage={handleAddPage}
              />
              <PreviewMode
                lessonId={selectedLessonId}
                pageId={selectedPageId}
                onSelectPage={(pageId) => setActiveLocation(selectedLessonId, pageId)}
              />
            </div>
          ) : (
            <>
              <main className="editor-panel editor-canvas-shell">
                <CanvasNavigator
                  draft={draft}
                  selectedLessonId={selectedLessonId}
                  selectedPageId={selectedPageId}
                  onSelectPage={(pageId) => {
                    if (!selectedLessonId) return;
                    setActiveLocation(selectedLessonId, pageId);
                  }}
                  onAddPage={handleAddPage}
                />

                {selectedLessonId && selectedPageId ? (
                  <>
                    <BlockCanvas
                      lessonId={selectedLessonId}
                      pageId={selectedPageId}
                      showAddMenu={false}
                    />
                  </>
                ) : (
                  <div className="editor-canvas-shell__empty">
                    <p>Select a lesson and page to start editing.</p>
                  </div>
                )}
              </main>

              <aside className="editor-panel editor-inspector" aria-label="Properties">
                <div className="editor-inspector__intro">
                  <h2>Properties</h2>
                </div>
                {selectedLessonId && selectedPageId ? (
                  <PropertyPanel lessonId={selectedLessonId} pageId={selectedPageId} />
                ) : null}
              </aside>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface CanvasNavigatorProps {
  draft: Course;
  selectedLessonId: string | null;
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
}

function CanvasNavigator({
  draft,
  selectedLessonId,
  selectedPageId,
  onSelectPage,
  onAddPage,
}: CanvasNavigatorProps) {
  const selectedLesson =
    draft.lessons.find((lesson) => lesson.lesson_id === selectedLessonId) ?? draft.lessons[0];

  return (
    <div className="editor-flowbar">
      <div className="editor-flowbar__row">
        <span className="editor-flowbar__label">Pages</span>
        <div className="editor-flowbar__chips">
          {selectedLesson?.pages.map((page, index) => (
            <button
              key={page.page_id}
              type="button"
              className={
                page.page_id === selectedPageId
                  ? 'editor-chip editor-chip--active'
                  : 'editor-chip'
              }
              onClick={() => onSelectPage(page.page_id)}
              aria-label={`Open page ${index + 1}`}
            >
              {index + 1}
            </button>
          ))}
          <button type="button" className="editor-chip editor-chip--ghost" onClick={onAddPage}>
            <PlusIcon className="h-3.5 w-3.5" />
            New page
          </button>
        </div>
      </div>
    </div>
  );
}
