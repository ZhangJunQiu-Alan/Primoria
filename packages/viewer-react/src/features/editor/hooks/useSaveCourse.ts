import { useCallback } from 'react';
import { fetchAgentJson } from '@/shared/api/agentService';
import { useAppDispatch, useAppSelector } from '@/store';
import { markClean, setSaving } from '@/store/editorSlice';
import type { Course } from '@primoria/schema';

async function saveToRemote(draft: Course) {
  await fetchAgentJson('/v1/builder/courses/save', {
    method: 'POST',
    body: JSON.stringify({
      draft,
    }),
  });
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
      await saveToRemote(draft);
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
