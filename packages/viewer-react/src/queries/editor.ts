import { useQuery } from '@tanstack/react-query';
import type { Course } from '@primoria/schema';
import type { Database, Json } from '../../../db/src';
import { parseCourse, migrateCourseJson } from '@primoria/schema';
import { supabase } from '@/lib/supabase';
import { resolveLocalCourseThumbnailUrl } from '@/shared/utils/localCourseCovers';

type CourseWithLessons = Pick<
  Database['public']['Tables']['courses']['Row'],
  | 'id'
  | 'title'
  | 'description'
  | 'status'
  | 'difficulty_level'
  | 'estimated_minutes'
  | 'tags'
  | 'thumbnail_url'
> & {
  lessons: Array<
    Pick<
      Database['public']['Tables']['lessons']['Row'],
      'id' | 'title' | 'sort_key' | 'content_json'
    >
  >;
};

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
}

function assembleCourseDraft(row: CourseWithLessons): Course {
  const raw: Record<string, unknown> = {
    course_id: row.id,
    metadata: {
      title: row.title,
      description: row.description ?? undefined,
      difficulty_level: row.difficulty_level,
      estimated_minutes: row.estimated_minutes,
      tags: row.tags,
      thumbnail: resolveLocalCourseThumbnailUrl({
        title: row.title,
        thumbnailUrl: row.thumbnail_url,
      }) ?? undefined,
    },
    lessons: row.lessons
      .sort((a, b) => a.sort_key - b.sort_key)
      .map((lesson) => {
        const lessonJson = asRecord(lesson.content_json);
        const pages = Array.isArray(lessonJson.pages)
          ? lessonJson.pages
          : [{ page_id: `page-${lesson.id}-0`, order: 0, blocks: [] }];

        return {
          lesson_id: lesson.id,
          title: lesson.title,
          pages,
        };
      }),
  };

  return parseCourse(migrateCourseJson(raw));
}

export const editorKeys = {
  course: (id: string) => ['editor', 'course', id] as const,
};

export function useCourseForEditor(courseId: string | undefined) {
  return useQuery({
    queryKey: editorKeys.course(courseId ?? ''),
    enabled: !!courseId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          status,
          difficulty_level,
          estimated_minutes,
          tags,
          thumbnail_url,
          lessons (
            id,
            title,
            sort_key,
            content_json
          )
        `)
        .eq('id', courseId!)
        .single();

      if (error) throw error;
      return assembleCourseDraft(data as CourseWithLessons);
    },
  });
}
