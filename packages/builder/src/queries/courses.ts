import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Course } from '@primoria/schema';
import type { Database, Json } from '../../../db/src';
import { parseCourse, migrateCourseJson } from '@primoria/schema';
import { nanoid } from '@/lib/nanoid';
import { supabase } from '@/lib/supabase';
import { buildCourseSlug } from '@/lib/courseSlug';
import { editorKeys } from '@/queries/editor';

type CourseTableRow = Database['public']['Tables']['courses']['Row'];
type LessonTableRow = Database['public']['Tables']['lessons']['Row'];
type CourseStatus = Database['public']['Enums']['course_status'];
type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type PriceTier = Database['public']['Enums']['price_tier'];
type LessonType = Database['public']['Enums']['lesson_type'];
type LessonUnlockType = Database['public']['Enums']['lesson_unlock_type'];

type CourseListSelectRow = Pick<
  CourseTableRow,
  | 'id'
  | 'title'
  | 'description'
  | 'thumbnail_url'
  | 'status'
  | 'created_at'
  | 'updated_at'
  | 'difficulty_level'
  | 'estimated_minutes'
  | 'price_tier'
  | 'price'
  | 'tags'
> & {
  lessons: Array<
    Pick<
      LessonTableRow,
      'id' | 'title' | 'sort_key' | 'duration_seconds' | 'type' | 'updated_at'
    >
  > | null;
};

type DuplicateCourseSourceRow = Pick<
  CourseTableRow,
  | 'id'
  | 'title'
  | 'description'
  | 'thumbnail_url'
  | 'difficulty_level'
  | 'estimated_minutes'
  | 'price_tier'
  | 'price'
  | 'tags'
> & {
  lessons: Array<
    Pick<
      LessonTableRow,
      | 'id'
      | 'title'
      | 'sort_key'
      | 'content_json'
      | 'duration_seconds'
      | 'type'
      | 'is_locked'
      | 'unlock_type'
      | 'prerequisite_lesson_id'
      | 'paywall_product_id'
      | 'xp_reward'
    >
  > | null;
};

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

const courseSelectFragment = `
  id,
  title,
  description,
  thumbnail_url,
  status,
  created_at,
  updated_at,
  difficulty_level,
  estimated_minutes,
  price_tier,
  price,
  tags
`;

const courseListSelectFragment = `
  ${courseSelectFragment},
  lessons (
    id,
    title,
    sort_key,
    duration_seconds,
    type,
    updated_at
  )
`;

const duplicateSourceSelectFragment = `
  id,
  title,
  description,
  thumbnail_url,
  difficulty_level,
  estimated_minutes,
  price_tier,
  price,
  tags,
  lessons (
    id,
    title,
    sort_key,
    content_json,
    duration_seconds,
    type,
    is_locked,
    unlock_type,
    prerequisite_lesson_id,
    paywall_product_id,
    xp_reward
  )
`;

function mapCourseRow(row: CourseListSelectRow): CourseRow {
  return {
    ...row,
    lessons: [...(row.lessons ?? [])].sort((a, b) => a.sort_key - b.sort_key),
  };
}

function normalizeCourseInput(payload: CreateCourseInput | UpdateCourseInput) {
  const title = payload.title.trim();
  const description = payload.description?.trim() || null;
  const thumbnail_url = payload.thumbnailUrl?.trim() || null;
  const difficulty_level = payload.difficultyLevel ?? 'beginner';
  const estimated_minutes = payload.estimatedMinutes ?? 0;
  const price_tier = payload.priceTier ?? 'free';
  const price = price_tier === 'premium' ? payload.price ?? 0 : 0;

  return {
    title,
    description,
    thumbnail_url,
    difficulty_level,
    estimated_minutes,
    price_tier,
    price,
  };
}

function buildLessonDraftJson(lessonId: string, title: string): Json {
  return {
    lesson_id: lessonId,
    title,
    pages: [
      {
        page_id: nanoid(),
        order: 0,
        blocks: [],
      },
    ],
  };
}

async function touchCourse(courseId: string) {
  const { error } = await supabase
    .from('courses')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId);

  if (error) throw error;
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
      const { data, error } = await supabase
        .from('courses')
        .select(courseListSelectFragment)
        .eq('author_id', userId!)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as CourseListSelectRow[]).map(mapCourseRow);
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCourseInput) => {
      const courseId = nanoid();
      const normalized = normalizeCourseInput(payload);

      const { data, error } = await supabase
        .from('courses')
        .insert({
          id: courseId,
          author_id: payload.userId,
          slug: buildCourseSlug(normalized.title, courseId),
          status: 'draft',
          tags: [],
          ...normalized,
        })
        .select(courseSelectFragment)
        .single();

      if (error) throw error;
      return { ...(data as CourseRow), lessons: [] };
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
      const normalized = normalizeCourseInput(payload);

      const { data, error } = await supabase
        .from('courses')
        .update({
          slug: buildCourseSlug(normalized.title, payload.id),
          updated_at: new Date().toISOString(),
          ...normalized,
        })
        .eq('id', payload.id)
        .eq('author_id', payload.userId)
        .select(courseSelectFragment)
        .single();

      if (error) throw error;
      return { ...(data as CourseRow), lessons: [] };
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
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
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
      const { data: src, error: srcErr } = await supabase
        .from('courses')
        .select(duplicateSourceSelectFragment)
        .eq('id', id)
        .single();

      if (srcErr) throw srcErr;

      const source = src as DuplicateCourseSourceRow;
      const newCourseId = nanoid();
      const copyTitle = `${source.title} (copy)`;

      const { data: newCourse, error: createErr } = await supabase
        .from('courses')
        .insert({
          id: newCourseId,
          author_id: userId,
          slug: buildCourseSlug(copyTitle, newCourseId),
          title: copyTitle,
          description: source.description,
          thumbnail_url: source.thumbnail_url,
          status: 'draft',
          difficulty_level: source.difficulty_level,
          estimated_minutes: source.estimated_minutes,
          price_tier: source.price_tier,
          price: source.price_tier === 'premium' ? source.price : 0,
          tags: source.tags,
        })
        .select(courseSelectFragment)
        .single();

      if (createErr) throw createErr;

      const sourceLessons = [...(source.lessons ?? [])].sort((a, b) => a.sort_key - b.sort_key);
      if (sourceLessons.length > 0) {
        const lessonIdMap = new Map(sourceLessons.map((lesson) => [lesson.id, nanoid()]));
        const lessonRows = sourceLessons.map((lesson) => ({
          id: lessonIdMap.get(lesson.id)!,
          course_id: newCourseId,
          title: lesson.title,
          sort_key: lesson.sort_key,
          content_json: lesson.content_json,
          duration_seconds: lesson.duration_seconds,
          type: lesson.type,
          is_locked: lesson.is_locked,
          unlock_type: lesson.unlock_type,
          prerequisite_lesson_id: lesson.prerequisite_lesson_id
            ? lessonIdMap.get(lesson.prerequisite_lesson_id) ?? null
            : null,
          paywall_product_id: lesson.paywall_product_id,
          xp_reward: lesson.xp_reward,
        }));

        const { error: lessonsErr } = await supabase.from('lessons').insert(lessonRows);
        if (lessonsErr) throw lessonsErr;
      }

      return { course: { ...(newCourse as CourseRow), lessons: [] }, userId };
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
          author_id: userId,
          slug: buildCourseSlug(course.metadata.title, newCourseId),
          title: course.metadata.title,
          description: course.metadata.description ?? null,
          thumbnail_url: course.metadata.thumbnail ?? null,
          status: 'draft',
          difficulty_level: course.metadata.difficulty_level ?? 'beginner',
          estimated_minutes: course.metadata.estimated_minutes ?? 0,
          price_tier: 'free',
          price: 0,
          tags: course.metadata.tags ?? [],
        })
        .select(courseSelectFragment)
        .single();

      if (createErr) throw createErr;

      if (course.lessons.length > 0) {
        const lessonRows = course.lessons.map((lesson, index) => ({
          id: lesson.lesson_id,
          course_id: newCourseId,
          title: lesson.title,
          sort_key: 1000 + index * 1000,
          content_json: lesson,
          type: 'interactive' as LessonType,
        }));

        const { error: lessonsErr } = await supabase.from('lessons').insert(lessonRows);
        if (lessonsErr) throw lessonsErr;
      }

      return { course: { ...(newCourse as CourseRow), lessons: [] }, userId };
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
      const nextTitle = title.trim();
      const lessonId = nanoid();

      const { data: lastLesson, error: sortErr } = await supabase
        .from('lessons')
        .select('sort_key')
        .eq('course_id', courseId)
        .order('sort_key', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sortErr) throw sortErr;

      const nextSortKey = ((lastLesson?.sort_key as number | undefined) ?? 0) + 1000;

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          id: lessonId,
          course_id: courseId,
          title: nextTitle,
          sort_key: nextSortKey,
          type: 'interactive' as LessonType,
          unlock_type: 'none' as LessonUnlockType,
          content_json: buildLessonDraftJson(lessonId, nextTitle),
        })
        .select('id, title, sort_key, duration_seconds, type, updated_at')
        .single();

      if (error) throw error;

      await touchCourse(courseId);

      return {
        courseId,
        userId,
        lesson: data as CourseLessonRow,
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
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId)
        .eq('course_id', courseId);

      if (error) throw error;

      await touchCourse(courseId);
      return { courseId, lessonId, userId };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.list(result.userId) });
      void queryClient.invalidateQueries({ queryKey: editorKeys.course(result.courseId) });
    },
  });
}
