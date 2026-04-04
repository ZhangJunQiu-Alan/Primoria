import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import type { Course } from '@primoria/schema';
import { useAppDispatch, useAppSelector } from '@/store';
import { openDraft, closeDraft } from '@/store/editorSlice';
import { useCourseForEditor } from '@/queries/editor';
import { EditorLayout } from '@/features/editor/EditorLayout';
import { SCHEMA_VERSION, SCHEMA_URL } from '@primoria/schema';
import { nanoid } from '@/lib/nanoid';
import { uuid } from '@/lib/uuid';

const DRAFT_STORAGE_PREFIX = 'primoria_builder_editor_draft';

function getDraftStorageKey(courseId?: string) {
  return `${DRAFT_STORAGE_PREFIX}:${courseId ?? 'new'}`;
}

function loadDraftFromStorage(courseId?: string): Course | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(courseId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { draft?: Course | null };
    return parsed?.draft ?? null;
  } catch {
    return null;
  }
}

function persistDraftToStorage(course: Course, courseId?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      getDraftStorageKey(courseId),
      JSON.stringify({
        draft: course,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Keep the editor usable even if storage quota is unavailable.
  }
}

function clearDraftFromStorage(courseId?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(getDraftStorageKey(courseId));
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function EditorPage() {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const localDraft = useAppSelector((s) => s.editor.draft);
  const isDirty = useAppSelector((s) => s.editor.isDirty);

  const { data: remoteCourse, isLoading, error } = useCourseForEditor(courseId);

  useEffect(() => {
    if (!courseId && user) {
      const recoveredDraft = loadDraftFromStorage();
      if (recoveredDraft) {
        dispatch(openDraft(recoveredDraft));
        return;
      }

      dispatch(
        openDraft({
          $schema: SCHEMA_URL,
          schema_version: SCHEMA_VERSION,
          course_id: uuid(),
          metadata: { title: 'Untitled Course' },
          lessons: [
            {
              lesson_id: uuid(),
              title: 'Lesson 1',
              pages: [{ page_id: nanoid(), order: 0, blocks: [] }],
            },
          ],
        }),
      );
    }
  }, [courseId, user?.id, dispatch]);

  useEffect(() => {
    if (!localDraft) {
      return;
    }

    if (isDirty) {
      persistDraftToStorage(localDraft, courseId);
      return;
    }

    clearDraftFromStorage(courseId);
  }, [courseId, isDirty, localDraft]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    return () => {
      dispatch(closeDraft());
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f7fb]">
        <p className="text-[#66758f]">Loading course…</p>
      </div>
    );
  }

  if (error || (!remoteCourse && courseId)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#f4f7fb]">
        <p className="text-[#c2410c]">Failed to load course.</p>
        <button
          onClick={() => navigate('/builder/dashboard')}
          className="rounded-md border border-[#d7dfef] px-4 py-2 text-sm text-[#22304d] transition hover:bg-[#eef3fb]"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  // New course — use the locally bootstrapped draft
  if (!courseId) {
    if (!localDraft) return null;
    return <EditorLayout remoteCourse={localDraft} />;
  }

  if (!remoteCourse) return null;
  return <EditorLayout remoteCourse={remoteCourse} />;
}
