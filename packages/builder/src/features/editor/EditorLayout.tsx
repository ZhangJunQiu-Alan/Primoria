import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { openDraft } from '@/store/editorSlice';
import { EditorHeader } from './EditorHeader';
import { LessonNav } from './sidebar/LessonNav';
import { BlockCanvas } from './canvas/BlockCanvas';
import { PropertyPanel } from './properties/PropertyPanel';
import { PreviewMode } from './preview/PreviewMode';
import { loadLocalDraft } from './hooks/useAutoSave';
import type { Course } from '@primoria/schema';

interface EditorLayoutProps {
  /** The remote course snapshot (from TanStack Query). Editor hydrates from this once. */
  remoteCourse: Course;
}

export function EditorLayout({ remoteCourse }: EditorLayoutProps) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.editor.draft);
  const previewMode = useAppSelector((s) => s.editor.previewMode);

  // Hydrate the Redux editor store on first mount
  useEffect(() => {
    const localDraft = loadLocalDraft(remoteCourse.course_id);
    // Prefer local draft if it exists (has unsaved local changes)
    dispatch(openDraft(localDraft ?? remoteCourse));
  }, [remoteCourse.course_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active lesson/page selection
  const firstLesson = draft?.lessons[0];
  const firstPage = firstLesson?.pages[0];

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    firstLesson?.lesson_id ?? null,
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    firstPage?.page_id ?? null,
  );

  // When draft loads, set initial selection
  useEffect(() => {
    if (draft && !selectedLessonId) {
      const l = draft.lessons[0];
      const p = l?.pages[0];
      if (l && p) {
        setSelectedLessonId(l.lesson_id);
        setSelectedPageId(p.page_id);
      }
    }
  }, [draft, selectedLessonId]);

  if (!draft) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading editor…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <EditorHeader activeLessonId={selectedLessonId} activePageId={selectedPageId} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: lesson nav */}
        <div className="w-56 shrink-0">
          <LessonNav
            selectedLessonId={selectedLessonId}
            selectedPageId={selectedPageId}
            onSelectLesson={(lessonId, pageId) => {
              setSelectedLessonId(lessonId);
              setSelectedPageId(pageId);
            }}
          />
        </div>

        {previewMode && selectedLessonId && selectedPageId ? (
          /* Learner preview — full width, no property panel */
          <PreviewMode lessonId={selectedLessonId} pageId={selectedPageId} />
        ) : (
          <>
            {/* Center: block canvas */}
            <div className="flex flex-1 overflow-hidden">
              {selectedLessonId && selectedPageId ? (
                <BlockCanvas lessonId={selectedLessonId} pageId={selectedPageId} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a lesson to start editing
                </div>
              )}
            </div>

            {/* Right: property panel */}
            <div className="w-72 shrink-0 border-l">
              {selectedLessonId && selectedPageId ? (
                <PropertyPanel lessonId={selectedLessonId} pageId={selectedPageId} />
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
