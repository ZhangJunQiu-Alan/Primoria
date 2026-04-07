import type {
  ViewerCourse,
  ViewerEnrollment,
  ViewerHomeCourseDetail,
  ViewerHomeLesson,
  ViewerHomePayload,
  ViewerStats,
  ViewerSubject,
} from '@/shared/api/viewer/types';
import { fetchCourseDetail, fetchEnrollments } from '@/shared/api/viewer/catalogApi';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';
import { fetchUserStats } from '@/shared/api/viewer/profileApi';
import { supabase } from '@/shared/api/supabase';
import {
  toBoolean,
  toNumber,
  toObject,
  toString,
  trimOrNull,
  usesViewerFixtures,
} from '@/shared/api/viewer/core';
import { normalizeViewerLanguage } from '@/shared/i18n/locale';
import { captureViewerError } from '@/shared/platform/observability';
import { resolveLocalCourseThumbnailUrl } from '@/shared/utils/localCourseCovers';

function normalizeSubject(row: Record<string, unknown>): ViewerSubject {
  return {
    id: toString(row.id),
    name: toString(row.name),
    color_hex: toString(row.color_hex) || '#6366f1',
  };
}

function normalizeCourse(row: Record<string, unknown>): ViewerCourse {
  const subject = normalizeSubject(toObject(Array.isArray(row.subjects) ? row.subjects[0] : row.subjects));

  return {
    id: toString(row.id),
    title: toString(row.title),
    slug: toString(row.slug),
    description: toString(row.description),
    thumbnail_url: resolveLocalCourseThumbnailUrl({
      slug: toString(row.slug),
      title: toString(row.title),
      thumbnailUrl: trimOrNull(row.thumbnail_url),
    }),
    content_language: row.content_language == null ? null : normalizeViewerLanguage(row.content_language),
    difficulty_level: toString(row.difficulty_level || 'beginner'),
    estimated_minutes: toNumber(row.estimated_minutes),
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => toString(tag)).filter(Boolean) : [],
    subject_id: toString(row.subject_id || subject.id),
    subjects: subject,
    published_at: trimOrNull(row.published_at),
  };
}

function normalizeEnrollment(row: Record<string, unknown>, fallbackCourse?: ViewerCourse): ViewerEnrollment {
  const courses = fallbackCourse ?? normalizeCourse(toObject(row.courses));

  return {
    id: trimOrNull(row.id) ?? undefined,
    course_id: toString(row.course_id || courses.id),
    status: toString(row.status || 'in_progress'),
    progress_bp: toNumber(row.progress_bp),
    started_at: trimOrNull(row.started_at),
    completed_at: trimOrNull(row.completed_at),
    last_accessed_at: trimOrNull(row.last_accessed_at),
    courses,
  };
}

function normalizeStats(row: Record<string, unknown>): ViewerStats {
  return {
    current_streak: toNumber(row.current_streak),
    longest_streak: toNumber(row.longest_streak),
    courses_completed: toNumber(row.courses_completed),
    lessons_completed: toNumber(row.lessons_completed),
    total_xp: toNumber(row.total_xp),
    total_study_minutes: toNumber(row.total_study_minutes),
    last_activity_date: trimOrNull(row.last_activity_date),
  };
}

function normalizeLesson(row: Record<string, unknown>): ViewerHomeLesson {
  return {
    id: toString(row.id),
    title: toString(row.title),
    sort_key: toNumber(row.sort_key),
    xp_reward: toNumber(row.xp_reward),
    duration_seconds: toNumber(row.duration_seconds),
    is_locked: toBoolean(row.is_locked),
    unlock_type: toString(row.unlock_type || 'none'),
  };
}

function normalizeSelectedCourseDetail(value: unknown): ViewerHomeCourseDetail | null {
  if (!value) {
    return null;
  }

  const record = toObject(value);
  const course = normalizeCourse(toObject(record.course));

  return {
    course,
    lessons: Array.isArray(record.lessons)
      ? record.lessons.map((lesson) => normalizeLesson(toObject(lesson)))
      : [],
    completed_lesson_ids: Array.isArray(record.completed_lesson_ids)
      ? record.completed_lesson_ids.map((lessonId) => toString(lessonId)).filter(Boolean)
      : [],
    enrollment: record.enrollment ? normalizeEnrollment(toObject(record.enrollment), course) : null,
  };
}

function normalizeHomePayload(value: unknown): ViewerHomePayload {
  const record = toObject(value);

  return {
    stats: normalizeStats(toObject(record.stats)),
    in_progress_enrollments: Array.isArray(record.in_progress_enrollments)
      ? record.in_progress_enrollments.map((entry) => normalizeEnrollment(toObject(entry)))
      : [],
    resolved_selected_course_id: trimOrNull(record.resolved_selected_course_id),
    selected_course_detail: normalizeSelectedCourseDetail(record.selected_course_detail),
  };
}

function parseTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortInProgressEnrollments(enrollments: ViewerEnrollment[]) {
  return enrollments
    .filter((entry) => entry.status === 'in_progress')
    .slice()
    .sort((left, right) => {
      const accessDelta = parseTimestamp(right.last_accessed_at) - parseTimestamp(left.last_accessed_at);
      if (accessDelta !== 0) {
        return accessDelta;
      }

      const startedDelta = parseTimestamp(right.started_at) - parseTimestamp(left.started_at);
      if (startedDelta !== 0) {
        return startedDelta;
      }

      return (right.progress_bp ?? 0) - (left.progress_bp ?? 0);
    });
}

function isUuidLike(value?: string | null) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function fetchLegacyViewerHomePayload(userId: string, selectedCourseId?: string | null): Promise<ViewerHomePayload> {
  const [stats, enrollments] = await Promise.all([fetchUserStats(userId), fetchEnrollments(userId)]);
  const inProgressEnrollments = sortInProgressEnrollments(enrollments);
  const preferredCourseId =
    selectedCourseId && inProgressEnrollments.some((entry) => entry.course_id === selectedCourseId)
      ? selectedCourseId
      : null;
  const resolvedSelectedCourseId = preferredCourseId ?? inProgressEnrollments[0]?.course_id ?? null;
  const legacyDetail = resolvedSelectedCourseId ? await fetchCourseDetail(resolvedSelectedCourseId, userId) : null;
  const selectedCourseDetail: ViewerHomeCourseDetail | null = legacyDetail
    ? {
        course: legacyDetail.course,
        lessons: legacyDetail.lessons.map((lesson) => ({
          id: toString(lesson.id),
          title: toString(lesson.title),
          sort_key: toNumber(lesson.sort_key),
          xp_reward: toNumber(lesson.xp_reward),
          duration_seconds: toNumber(lesson.duration_seconds),
          is_locked: toBoolean(lesson.is_locked),
          unlock_type: toString(lesson.unlock_type || 'none'),
        })),
        completed_lesson_ids: legacyDetail.completed_lesson_ids.map((lessonId) => toString(lessonId)).filter(Boolean),
        enrollment: (() => {
          if (!legacyDetail.enrollment) {
            return null;
          }

          const enrollment = legacyDetail.enrollment as Partial<ViewerEnrollment> & { courses?: ViewerCourse };
          return {
            ...enrollment,
            course_id: toString(enrollment.course_id || legacyDetail.course.id),
            status: toString(enrollment.status || 'in_progress'),
            progress_bp: toNumber(enrollment.progress_bp),
            courses: enrollment.courses ?? legacyDetail.course,
          };
        })(),
      }
    : null;

  return {
    stats,
    in_progress_enrollments: inProgressEnrollments,
    resolved_selected_course_id: resolvedSelectedCourseId,
    selected_course_detail: selectedCourseDetail,
  };
}

export async function fetchViewerHomePayload(userId: string, selectedCourseId?: string | null) {
  if (usesViewerFixtures()) {
    const { getFixtureHomePayload } = await loadFixtureStore();
    return getFixtureHomePayload(selectedCourseId ?? null);
  }

  const normalizedSelectedCourseId = isUuidLike(selectedCourseId) ? selectedCourseId : null;

  const { data, error } = await supabase.rpc('get_viewer_home_payload', {
    p_selected_course_id: normalizedSelectedCourseId,
  });

  if (error) {
    captureViewerError(error, {
      area: 'viewer_home_payload_rpc',
      userId,
      selectedCourseId: selectedCourseId ?? null,
    });
    return fetchLegacyViewerHomePayload(userId, normalizedSelectedCourseId);
  }

  const payload = normalizeHomePayload(data);
  if (!payload.in_progress_enrollments.every((entry) => entry.courses.id)) {
    captureViewerError(new Error(`Invalid home payload for user ${userId}`), {
      area: 'viewer_home_payload_invalid',
      userId,
    });
    return fetchLegacyViewerHomePayload(userId, normalizedSelectedCourseId);
  }
  return payload;
}
