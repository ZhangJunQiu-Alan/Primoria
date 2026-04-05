import type { ViewerCourse, ViewerEnrollment, ViewerSubject } from '@/shared/api/viewer/types';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';
import { normalizeViewerLanguage } from '@/shared/i18n/locale';
import { supabase } from '@/shared/api/supabase';

function normalizeSubject(row: Record<string, unknown>): ViewerSubject {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    color_hex: String(row.color_hex ?? '#6366f1'),
  };
}

function normalizeCourse(row: Record<string, unknown>): ViewerCourse {
  const subjectValue = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
  const subject = normalizeSubject((subjectValue ?? {}) as Record<string, unknown>);
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    description: String(row.description ?? ''),
    thumbnail_url: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
    content_language: row.content_language == null ? null : normalizeViewerLanguage(row.content_language),
    difficulty_level: String(row.difficulty_level ?? 'beginner'),
    estimated_minutes: Number(row.estimated_minutes ?? 0),
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)) : [],
    subject_id: String(row.subject_id ?? subject.id),
    subjects: subject,
    published_at: typeof row.published_at === 'string' ? row.published_at : null,
  };
}

export async function fetchSubjects() {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().subjects];
  }

  const { data, error } = await supabase.from('subjects').select('id, name, color_hex').order('name');
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => normalizeSubject(row as Record<string, unknown>));
}

export async function fetchCourses(params: { searchQuery?: string; subjectId?: string }) {
  const { searchQuery, subjectId } = params;
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    const state = readFixtureState();
    return state.courses.filter((course) => {
      const subjectMatch = !subjectId || course.subject_id === subjectId;
      const search = searchQuery?.trim().toLowerCase();
      const searchMatch =
        !search ||
        course.title.toLowerCase().includes(search) ||
        course.description.toLowerCase().includes(search) ||
        course.tags.some((tag) => tag.toLowerCase().includes(search));
      return subjectMatch && searchMatch;
    });
  }

  let query = supabase
    .from('courses')
    .select(
      'id, title, slug, description, thumbnail_url, content_language, difficulty_level, estimated_minutes, tags, subject_id, published_at, subjects(id, name, color_hex)',
    )
    .eq('status', 'published');

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const trimmed = searchQuery?.trim();
  if (trimmed) {
    query = query.or(`title.ilike.%${trimmed}%,description.ilike.%${trimmed}%`);
  }

  const { data, error } = await query.order('published_at', { ascending: false }).limit(30);
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeCourse(row as Record<string, unknown>));
}

export async function fetchEnrollments(userId: string) {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().enrollments];
  }

  const { data, error } = await supabase
    .from('enrollments')
    .select(
      'id, course_id, status, progress_bp, started_at, completed_at, last_accessed_at, courses(id, title, slug, description, thumbnail_url, content_language, difficulty_level, estimated_minutes, tags, subject_id, published_at, subjects(id, name, color_hex))',
    )
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false });
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: typeof record.id === 'string' ? record.id : undefined,
      course_id: String(record.course_id ?? ''),
      status: String(record.status ?? 'in_progress'),
      progress_bp: Number(record.progress_bp ?? 0),
      started_at: typeof record.started_at === 'string' ? record.started_at : null,
      completed_at: typeof record.completed_at === 'string' ? record.completed_at : null,
      last_accessed_at: typeof record.last_accessed_at === 'string' ? record.last_accessed_at : null,
      courses: normalizeCourse((record.courses ?? {}) as Record<string, unknown>),
    } satisfies ViewerEnrollment;
  });
}

export async function fetchCourseDetail(courseId: string, userId?: string) {
  if (usesViewerFixtures()) {
    const { getFixtureCourseDetail } = await loadFixtureStore();
    return getFixtureCourseDetail(courseId);
  }

  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select(
      'id, title, slug, description, thumbnail_url, content_language, difficulty_level, estimated_minutes, tags, subject_id, published_at, subjects(id, name, color_hex)',
    )
    .eq('id', courseId)
    .single();
  if (courseError) {
    throw courseError;
  }

  const { data: lessonsData, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, sort_key, xp_reward, duration_seconds, is_locked, unlock_type')
    .eq('course_id', courseId)
    .order('sort_key');
  if (lessonsError) {
    throw lessonsError;
  }

  let completed_lesson_ids: string[] = [];
  if (userId && lessonsData?.length) {
    const lessonIds = lessonsData.map((lesson) => String(lesson.id));
    const { data: completions, error: completionsError } = await supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds);
    if (completionsError) {
      throw completionsError;
    }
    completed_lesson_ids = (completions ?? []).map((row) => String(row.lesson_id));
  }

  let enrollment = null;
  if (userId) {
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, course_id, status, progress_bp, started_at, completed_at, last_accessed_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (enrollmentError) {
      throw enrollmentError;
    }
    enrollment = enrollmentData
      ? {
          ...(enrollmentData as Record<string, unknown>),
          courses: normalizeCourse(courseData as Record<string, unknown>),
        }
      : null;
  }

  return {
    course: normalizeCourse(courseData as Record<string, unknown>),
    lessons: (lessonsData ?? []).map((lesson) => ({
      id: String(lesson.id),
      title: String(lesson.title ?? ''),
      sort_key: Number(lesson.sort_key ?? 0),
      xp_reward: Number(lesson.xp_reward ?? 0),
      duration_seconds: Number(lesson.duration_seconds ?? 0),
      is_locked: lesson.is_locked === true,
      unlock_type: String(lesson.unlock_type ?? 'none'),
    })),
    completed_lesson_ids,
    enrollment,
  };
}

export async function enrollInCourse(courseId: string, userId: string) {
  if (usesViewerFixtures()) {
    const { readFixtureState, writeFixtureState } = await loadFixtureStore();
    const next = readFixtureState();
    const existing = next.enrollments.find((entry) => entry.course_id === courseId);
    if (existing) {
      return existing;
    }
    if (!next.enrollments.some((entry) => entry.course_id === courseId)) {
      const course = next.courses.find((entry) => entry.id === courseId);
      if (course) {
        const enrollment = {
          course_id: courseId,
          status: 'in_progress',
          progress_bp: 0,
          last_accessed_at: new Date().toISOString(),
          courses: course,
        } satisfies ViewerEnrollment;
        next.enrollments.unshift(enrollment);
        writeFixtureState(next);
        return enrollment;
      }
    }
    throw new Error('Fixture course could not be resolved for enrollment.');
  }

  const { data, error } = await supabase
    .from('enrollments')
    .upsert({ user_id: userId, course_id: courseId, status: 'in_progress' }, { onConflict: 'user_id,course_id' })
    .select('id, course_id, status, progress_bp, started_at, completed_at, last_accessed_at')
    .single();
  if (error) {
    throw error;
  }

  return {
    id: typeof data.id === 'string' ? data.id : undefined,
    course_id: String(data.course_id ?? courseId),
    status: String(data.status ?? 'in_progress'),
    progress_bp: Number(data.progress_bp ?? 0),
    started_at: typeof data.started_at === 'string' ? data.started_at : null,
    completed_at: typeof data.completed_at === 'string' ? data.completed_at : null,
    last_accessed_at: typeof data.last_accessed_at === 'string' ? data.last_accessed_at : null,
  };
}
