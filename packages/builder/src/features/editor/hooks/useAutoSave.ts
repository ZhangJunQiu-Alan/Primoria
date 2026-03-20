import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppDispatch, useAppSelector } from '@/store';
import { markClean, setSaving } from '@/store/editorSlice';
import { buildCourseSlug } from '@/lib/courseSlug';
import { migrateCourseJson, parseCourse } from '@primoria/schema';
import type { Course } from '@primoria/schema';

const LS_KEY = (id: string) => `primoria_draft_${id}`;

// ─── Local draft persistence ──────────────────────────────────────────────────

function saveToLocalStorage(draft: Course) {
  try {
    localStorage.setItem(LS_KEY(draft.course_id), JSON.stringify(draft));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function loadLocalDraft(courseId: string): Course | null {
  try {
    const raw = localStorage.getItem(LS_KEY(courseId));
    if (!raw) return null;
    return parseCourse(migrateCourseJson(JSON.parse(raw) as Record<string, unknown>));
  } catch {
    return null;
  }
}

export function clearLocalDraft(courseId: string) {
  localStorage.removeItem(LS_KEY(courseId));
}

// ─── Remote persistence (Supabase upsert) ────────────────────────────────────

async function saveToRemote(draft: Course, authorId: string) {
  // 1) Upsert course metadata
  const { error: courseErr } = await supabase.from('courses').upsert(
    {
      id: draft.course_id,
      author_id: authorId,
      slug: buildCourseSlug(draft.metadata.title, draft.course_id),
      title: draft.metadata.title,
      description: draft.metadata.description ?? null,
      thumbnail_url: draft.metadata.thumbnail ?? null,
      difficulty_level: draft.metadata.difficulty_level ?? 'beginner',
      estimated_minutes: draft.metadata.estimated_minutes ?? 0,
      tags: draft.metadata.tags ?? [],
      status: 'draft',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (courseErr) throw courseErr;

  // 2) Upsert every lesson row (creates new rows for lessons added in-editor)
  const lessonRows = draft.lessons.map((lesson, i) => ({
    id: lesson.lesson_id,
    course_id: draft.course_id,
    title: lesson.title,
    sort_key: 1000 + i * 1000,
    type: 'interactive',
    duration_seconds: 0,
    content_json: {
      lesson_id: lesson.lesson_id,
      title: lesson.title,
      pages: lesson.pages,
    },
  }));

  if (lessonRows.length > 0) {
    const { error: lessonErr } = await supabase
      .from('lessons')
      .upsert(lessonRows, { onConflict: 'id' });
    if (lessonErr) throw lessonErr;
  }

  // 3) Remove any lessons deleted from the draft
  // (fetch existing IDs and delete ones no longer in the draft)
  const draftLessonIds = draft.lessons.map((l) => l.lesson_id);
  const { data: existing } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', draft.course_id);

  const toDelete = (existing ?? [])
    .map((r) => r.id as string)
    .filter((id) => !draftLessonIds.includes(id));

  if (toDelete.length > 0) {
    await supabase.from('lessons').delete().in('id', toDelete);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseAutoSaveOptions {
  onRemoteSaved?: () => void;
  onRemoteError?: (err: unknown) => void;
}

export function useAutoSave({ onRemoteSaved, onRemoteError }: UseAutoSaveOptions = {}) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.editor.draft);
  const userId = useAppSelector((s) => s.auth.user?.id);

  const forceSave = useCallback(async () => {
    if (!draft || !userId) return;
    dispatch(setSaving(true));
    try {
      await saveToRemote(draft, userId);
      saveToLocalStorage(draft);
      dispatch(markClean());
      onRemoteSaved?.();
    } catch (err) {
      onRemoteError?.(err);
    } finally {
      dispatch(setSaving(false));
    }
  }, [dispatch, draft, onRemoteSaved, onRemoteError, userId]);

  return { forceSave };
}
