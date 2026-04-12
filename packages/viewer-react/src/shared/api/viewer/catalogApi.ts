import { fetchAgentJson } from '@/shared/api/agentService';
import type { ViewerCourse, ViewerEnrollment, ViewerSubject } from '@/shared/api/viewer/types';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';
import { normalizeViewerLanguage } from '@/shared/i18n/locale';
import { resolveLocalCourseThumbnailUrl } from '@/shared/utils/localCourseCovers';

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
    thumbnail_url: resolveLocalCourseThumbnailUrl({
      slug: String(row.slug ?? ''),
      title: String(row.title ?? ''),
      thumbnailUrl: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
    }),
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
  const payload = await fetchAgentJson<{ subjects: Record<string, unknown>[] }>('/v1/viewer/subjects');
  return (payload.subjects ?? []).map((row) => normalizeSubject(row as Record<string, unknown>));
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
  const query = new URLSearchParams();
  if (searchQuery?.trim()) {
    query.set('search', searchQuery.trim());
  }
  if (subjectId?.trim()) {
    query.set('subject_id', subjectId.trim());
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await fetchAgentJson<{ courses: Record<string, unknown>[] }>(`/v1/viewer/courses${suffix}`);
  return (payload.courses ?? []).map((row) => normalizeCourse(row as Record<string, unknown>));
}

export async function fetchEnrollments(userId: string) {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    return [...readFixtureState().enrollments];
  }
  const payload = await fetchAgentJson<{ enrollments: Array<Record<string, unknown>> }>('/v1/viewer/enrollments');
  return (payload.enrollments ?? []).map((row) => {
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
  const payload = await fetchAgentJson<{
    course: ViewerCourse;
    lessons: Array<{
      id: string;
      title: string;
      sort_key: number;
      xp_reward: number;
      duration_seconds: number;
      is_locked: boolean;
      unlock_type: string;
    }>;
    completed_lesson_ids: string[];
    enrollment: ViewerEnrollment | null;
  }>(`/v1/courses/${courseId}/detail`);
  return {
    ...payload,
    course: normalizeCourse(payload.course as unknown as Record<string, unknown>),
    enrollment: payload.enrollment
      ? {
          ...payload.enrollment,
          courses: normalizeCourse((payload.enrollment.courses ?? payload.course) as unknown as Record<string, unknown>),
        }
      : null,
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
  const data = await fetchAgentJson<{
    id?: string;
    course_id?: string;
    status?: string;
    progress_bp?: number;
    started_at?: string | null;
    completed_at?: string | null;
    last_accessed_at?: string | null;
  }>(`/v1/viewer/courses/${courseId}/enroll`, {
    method: 'POST',
  });

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
