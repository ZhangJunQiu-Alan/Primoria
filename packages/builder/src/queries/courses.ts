import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { nanoid } from '@/lib/nanoid';
import { parseCourse, migrateCourseJson } from '@primoria/schema';
import type { Course } from '@primoria/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const courseKeys = {
  all: ['courses'] as const,
  list: (userId: string) => ['courses', 'list', userId] as const,
  detail: (id: string) => ['courses', 'detail', id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCourseList(userId: string | undefined) {
  return useQuery({
    queryKey: courseKeys.list(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail, status, created_at, updated_at')
        .eq('author_id', userId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as CourseRow[];
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; userId: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .insert({ title: payload.title, author_id: payload.userId, status: 'draft' })
        .select('id, title, description, thumbnail, status, created_at, updated_at')
        .single();
      if (error) throw error;
      return data as CourseRow;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(variables.userId) });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      return { id, userId };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(result.userId) });
    },
  });
}

export function useDuplicateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      // Fetch source course + lessons
      const { data: src, error: srcErr } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail, status, lessons ( id, title, order_index, content_json )')
        .eq('id', id)
        .single();
      if (srcErr) throw srcErr;

      type SrcCourse = {
        id: string;
        title: string;
        description: string | null;
        thumbnail: string | null;
        lessons: Array<{ id: string; title: string; order_index: number; content_json: Record<string, unknown> | null }>;
      };
      const srcTyped = src as unknown as SrcCourse;

      const newCourseId = nanoid();
      const { data: newCourse, error: createErr } = await supabase
        .from('courses')
        .insert({
          id: newCourseId,
          title: `${srcTyped.title} (copy)`,
          description: srcTyped.description,
          thumbnail: srcTyped.thumbnail,
          author_id: userId,
          status: 'draft',
        })
        .select('id, title, description, thumbnail, status, created_at, updated_at')
        .single();
      if (createErr) throw createErr;

      // Duplicate lessons
      const srcLessons = srcTyped.lessons ?? [];
      if (srcLessons.length > 0) {
        const lessonRows = srcLessons.map((l) => ({
          id: nanoid(),
          course_id: newCourseId,
          title: l.title,
          order_index: l.order_index,
          content_json: l.content_json,
        }));
        const { error: lessonsErr } = await supabase.from('lessons').insert(lessonRows);
        if (lessonsErr) throw lessonsErr;
      }

      return { course: newCourse as CourseRow, userId };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(result.userId) });
    },
  });
}

export function useImportCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ raw, userId }: { raw: unknown; userId: string }) => {
      const course: Course = parseCourse(migrateCourseJson(raw as Record<string, unknown>));
      const newCourseId = nanoid();

      const { data: newCourse, error: createErr } = await supabase
        .from('courses')
        .insert({
          id: newCourseId,
          title: course.metadata.title,
          description: course.metadata.description ?? null,
          author_id: userId,
          status: 'draft',
        })
        .select('id, title, description, thumbnail, status, created_at, updated_at')
        .single();
      if (createErr) throw createErr;

      if (course.lessons.length > 0) {
        const lessonRows = course.lessons.map((l, i) => ({
          id: nanoid(),
          course_id: newCourseId,
          title: l.title,
          order_index: i,
          content_json: { pages: l.pages },
        }));
        const { error: lessonsErr } = await supabase.from('lessons').insert(lessonRows);
        if (lessonsErr) throw lessonsErr;
      }

      return { course: newCourse as CourseRow, userId };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(result.userId) });
    },
  });
}
