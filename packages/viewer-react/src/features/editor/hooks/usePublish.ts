import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import { CourseSchema } from '@primoria/schema';
import type { ZodError } from 'zod';

interface PublishResult {
  success: boolean;
  validationErrors?: ZodError;
  serverError?: string;
}

export function usePublish(saveCourse: () => Promise<void>) {
  const draft = useAppSelector((s) => s.editor.draft);
  const [publishing, setPublishing] = useState(false);

  const publish = useCallback(async (): Promise<PublishResult> => {
    if (!draft) return { success: false, serverError: 'No draft open' };

    // Strict Zod validation before publish
    const parsed = CourseSchema.safeParse(draft);
    if (!parsed.success) {
      return { success: false, validationErrors: parsed.error };
    }

    setPublishing(true);
    try {
      await saveCourse();

      const { error } = await supabase
        .from('courses')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', draft.course_id);

      if (error) return { success: false, serverError: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, serverError: String(err) };
    } finally {
      setPublishing(false);
    }
  }, [draft, saveCourse]);

  return { publish, publishing };
}
