import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAgentJson } from '@/shared/api/agentService';
import { editorKeys } from '@/queries/editor';
import { resolveLocalCourseThumbnailUrl } from '@/shared/utils/localCourseCovers';
type CourseStatus = 'draft' | 'published' | 'archived';
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
type PriceTier = 'free' | 'premium';
type LessonType = 'interactive' | 'quiz' | 'video' | 'article';

export interface CourseLessonRow {
  id: string;
  title: string;
  sort_key: number;
  duration_seconds: number;
  type: LessonType;
  updated_at: string;
}

export interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  status: CourseStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  difficulty_level: DifficultyLevel;
  estimated_minutes: number;
  price_tier: PriceTier;
  price: number;
  tags: string[];
  lessons: CourseLessonRow[];
}

export interface CreateCourseInput {
  title: string;
  userId: string;
  description?: string;
  thumbnailUrl?: string;
  difficultyLevel?: DifficultyLevel;
  estimatedMinutes?: number | null;
  priceTier?: PriceTier;
  price?: number;
}

export interface UpdateCourseInput extends CreateCourseInput {
  id: string;
}

interface AddLessonInput {
  courseId: string;
  userId: string;
  title: string;
}

interface DeleteLessonInput {
  courseId: string;
  lessonId: string;
  userId: string;
}

function mapCourseRow(row: CourseRow): CourseRow {
  return {
    ...row,
    thumbnail_url: resolveLocalCourseThumbnailUrl({
      title: row.title,
      thumbnailUrl: row.thumbnail_url,
    }),
    lessons: [...(row.lessons ?? [])].sort((a, b) => a.sort_key - b.sort_key),
  };
}

export const courseKeys = {
  all: ['courses'] as const,
  list: (userId: string) => ['courses', 'list', userId] as const,
  detail: (id: string) => ['courses', 'detail', id] as const,
};

export function useCourseList(userId: string | undefined) {
  return useQuery({
    queryKey: courseKeys.list(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const payload = await fetchAgentJson<{ courses: CourseRow[] }>('/v1/builder/courses');
      return payload.courses.map(mapCourseRow);
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCourseInput) => {
      const result = await fetchAgentJson<{ course: CourseRow }>('/v1/builder/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          thumbnailUrl: payload.thumbnailUrl,
          difficultyLevel: payload.difficultyLevel ?? 'beginner',
          estimatedMinutes: payload.estimatedMinutes ?? 0,
          priceTier: payload.priceTier ?? 'free',
          price: payload.price ?? 0,
        }),
      });
      return result.course;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(variables.userId) });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateCourseInput) => {
      const result = await fetchAgentJson<{ course: CourseRow }>(`/v1/builder/courses/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          thumbnailUrl: payload.thumbnailUrl,
          difficultyLevel: payload.difficultyLevel ?? 'beginner',
          estimatedMinutes: payload.estimatedMinutes ?? 0,
          priceTier: payload.priceTier ?? 'free',
          price: payload.price ?? 0,
        }),
      });
      return result.course;
    },
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(variables.userId) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(result.id) });
      void queryClient.invalidateQueries({ queryKey: editorKeys.course(result.id) });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      await fetchAgentJson(`/v1/builder/courses/${id}`, {
        method: 'DELETE',
      });
      return { id, userId };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(result.userId) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(result.id) });
      void queryClient.invalidateQueries({ queryKey: editorKeys.course(result.id) });
    },
  });
}

export function useDuplicateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const result = await fetchAgentJson<{ course: CourseRow }>(`/v1/builder/courses/${id}/duplicate`, {
        method: 'POST',
      });
      return { course: result.course, userId };
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
      const result = await fetchAgentJson<{ course_id: string }>('/v1/builder/courses/import', {
        method: 'POST',
        body: JSON.stringify({ raw }),
      });
      return { course: { id: result.course_id } as CourseRow, userId };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(result.userId) });
    },
  });
}

export function useAddLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, userId, title }: AddLessonInput) => {
      const result = await fetchAgentJson<{ lesson: CourseLessonRow }>(`/v1/builder/courses/${courseId}/lessons`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      return {
        courseId,
        userId,
        lesson: result.lesson,
      };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(result.userId) });
      void queryClient.invalidateQueries({ queryKey: editorKeys.course(result.courseId) });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, lessonId, userId }: DeleteLessonInput) => {
      await fetchAgentJson(`/v1/builder/courses/${courseId}/lessons/${lessonId}`, {
        method: 'DELETE',
      });
      return { courseId, lessonId, userId };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(result.userId) });
      void queryClient.invalidateQueries({ queryKey: editorKeys.course(result.courseId) });
    },
  });
}
