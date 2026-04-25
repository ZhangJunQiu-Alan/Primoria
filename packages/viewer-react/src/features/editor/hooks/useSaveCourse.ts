import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppDispatch, useAppSelector } from '@/store';
import { markClean, setSaving } from '@/store/editorSlice';
import { buildCourseSlug } from '@/lib/courseSlug';
import type { Course } from '@primoria/schema';

async function saveToRemote(draft: Course, authorId: string) {
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

  const draftLessonIds = draft.lessons.map((lesson) => lesson.lesson_id);
  const { data: existing, error: existingErr } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', draft.course_id);

  if (existingErr) throw existingErr;

  const toDelete = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !draftLessonIds.includes(id));

  if (toDelete.length > 0) {
    const { error: deleteErr } = await supabase.from('lessons').delete().in('id', toDelete);
    if (deleteErr) throw deleteErr;
  }
}

interface UseSaveCourseOptions {
  onRemoteSaved?: () => void;
  onRemoteError?: (err: unknown) => void;
}

export function useSaveCourse({ onRemoteSaved, onRemoteError }: UseSaveCourseOptions = {}) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.editor.draft);
  const userId = useAppSelector((s) => s.auth.user?.id);

  const saveCourse = useCallback(async () => {
    if (!draft) {
      throw new Error('No draft open');
    }

    if (!userId) {
      throw new Error('Please sign in to save this course.');
    }

    dispatch(setSaving(true));
    try {
      await saveToRemote(draft, userId);
      dispatch(markClean());
      onRemoteSaved?.();
    } catch (err) {
      onRemoteError?.(err);
      throw err;
    } finally {
      dispatch(setSaving(false));
    }
  }, [dispatch, draft, onRemoteSaved, onRemoteError, userId]);

  return { saveCourse };
}
