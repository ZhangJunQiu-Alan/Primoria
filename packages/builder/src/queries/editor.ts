import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { parseCourse, migrateCourseJson } from '@primoria/schema';
import type { Course } from '@primoria/schema';

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const editorKeys = {
  course: (id: string) => ['editor', 'course', id] as const,
};

// ─── Raw DB shape ─────────────────────────────────────────────────────────────

interface CourseWithLessons {
  id: string;
  title: string;
  description: string | null;
  status: string;
  lessons: Array<{
    id: string;
    title: string;
    order_index: number;
    content_json: Record<string, unknown> | null;
  }>;
}

/**
 * Reconstruct a full Course object from the courses + lessons rows.
 * Each lesson's content_json holds its pages/blocks snapshot.
 */
function assembleCourseDraft(row: CourseWithLessons): Course {
  const raw: Record<string, unknown> = {
    course_id: row.id,
    metadata: { title: row.title, description: row.description },
    lessons: row.lessons
      .sort((a, b) => a.order_index - b.order_index)
      .map((l) => {
        const lessonJson = l.content_json ?? {};
        return {
          lesson_id: l.id,
          title: l.title,
          pages: lessonJson['pages'] ?? [
            { page_id: `page-${l.id}-0`, order: 0, blocks: [] },
          ],
        };
      }),
  };
  return parseCourse(migrateCourseJson(raw));
}

export function useCourseForEditor(courseId: string | undefined) {
  return useQuery({
    queryKey: editorKeys.course(courseId ?? ''),
    enabled: !!courseId,
    staleTime: Infinity, // editor loads once — draft lives in Redux, not Query cache
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(
          `
          id, title, description, status,
          lessons ( id, title, order_index, content_json )
        `,
        )
        .eq('id', courseId!)
        .single();
      if (error) throw error;
      return assembleCourseDraft(data as CourseWithLessons);
    },
  });
}
