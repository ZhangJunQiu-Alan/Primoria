import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppDispatch, useAppSelector } from '@/store';
import { markClean, setSaving } from '@/store/editorSlice';
import type { Course } from '@primoria/schema';

const LS_KEY = (id: string) => `primoria_draft_${id}`;

// ─── Tier 1: localStorage ─────────────────────────────────────────────────────

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
    return raw ? (JSON.parse(raw) as Course) : null;
  } catch {
    return null;
  }
}

export function clearLocalDraft(courseId: string) {
  localStorage.removeItem(LS_KEY(courseId));
}

// ─── Tier 2: remote (Supabase upsert) ────────────────────────────────────────

async function saveToRemote(draft: Course) {
  // 1) Upsert course metadata
  const { error: courseErr } = await supabase.from('courses').upsert(
    {
      id: draft.course_id,
      title: draft.metadata.title,
      description: draft.metadata.description ?? null,
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
    order_index: i,
    content_json: { pages: lesson.pages },
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

const SHORT_DEBOUNCE_MS = 500;   // → localStorage
const MEDIUM_DEBOUNCE_MS = 4000; // → remote

interface UseAutoSaveOptions {
  onRemoteSaved?: () => void;
  onRemoteError?: (err: unknown) => void;
}

export function useAutoSave({ onRemoteSaved, onRemoteError }: UseAutoSaveOptions = {}) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.editor.draft);
  const isDirty = useAppSelector((s) => s.editor.isDirty);

  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const forceSave = useCallback(async () => {
    const current = draftRef.current;
    if (!current) return;
    dispatch(setSaving(true));
    try {
      await saveToRemote(current);
      saveToLocalStorage(current);
      dispatch(markClean());
      onRemoteSaved?.();
    } catch (err) {
      onRemoteError?.(err);
    } finally {
      dispatch(setSaving(false));
    }
  }, [dispatch, onRemoteSaved, onRemoteError]);

  useEffect(() => {
    if (!isDirty || !draft) return;

    // Tier 1: short debounce → localStorage
    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    localTimerRef.current = setTimeout(() => {
      saveToLocalStorage(draft);
    }, SHORT_DEBOUNCE_MS);

    // Tier 2: medium debounce → remote
    if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    remoteTimerRef.current = setTimeout(() => {
      const current = draftRef.current;
      if (!current) return;
      dispatch(setSaving(true));
      saveToRemote(current)
        .then(() => {
          dispatch(markClean());
          onRemoteSaved?.();
        })
        .catch((err) => {
          onRemoteError?.(err);
        })
        .finally(() => {
          dispatch(setSaving(false));
        });
    }, MEDIUM_DEBOUNCE_MS);

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    };
  }, [isDirty, draft, dispatch, onRemoteSaved, onRemoteError]);

  return { forceSave };
}
