import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { openDraft, closeDraft } from '@/store/editorSlice';
import { useCourseForEditor } from '@/queries/editor';
import { EditorLayout } from '@/features/editor/EditorLayout';
import { SCHEMA_VERSION, SCHEMA_URL } from '@primoria/schema';
import { nanoid } from '@/lib/nanoid';
import { uuid } from '@/lib/uuid';

export function EditorPage() {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const localDraft = useAppSelector((s) => s.editor.draft);

  const { data: remoteCourse, isLoading, error } = useCourseForEditor(courseId);

  useEffect(() => {
    if (!courseId && user) {
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
    return () => {
      dispatch(closeDraft());
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading course…</p>
      </div>
    );
  }

  if (error || (!remoteCourse && courseId)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-destructive">Failed to load course.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
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
