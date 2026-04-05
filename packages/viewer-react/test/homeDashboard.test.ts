import { describe, expect, it } from 'vitest';
import type { ViewerCourse, ViewerEnrollment, ViewerStats } from '@/shared/api/viewer/types';
import {
  buildHomeCoachState,
  getHomeContinueTarget,
  getHomeSelectedCourse,
  sortHomeInProgressEnrollments,
} from '@/features/home/homeDashboard';

function createCourse(overrides: Partial<ViewerCourse> = {}): ViewerCourse {
  return {
    id: overrides.id ?? 'course-1',
    title: overrides.title ?? 'Course One',
    slug: overrides.slug ?? 'course-one',
    description: overrides.description ?? 'A course description.',
    thumbnail_url: overrides.thumbnail_url ?? null,
    difficulty_level: overrides.difficulty_level ?? 'beginner',
    estimated_minutes: overrides.estimated_minutes ?? 25,
    tags: overrides.tags ?? [],
    subject_id: overrides.subject_id ?? 'subject-1',
    subjects: overrides.subjects ?? {
      id: 'subject-1',
      name: 'Physics',
      color_hex: '#a8c5ac',
    },
    published_at: overrides.published_at ?? '2026-03-01T00:00:00Z',
  };
}

function createEnrollment(overrides: Partial<ViewerEnrollment> = {}): ViewerEnrollment {
  const course = overrides.courses ?? createCourse();
  return {
    id: overrides.id,
    course_id: overrides.course_id ?? course.id,
    status: overrides.status ?? 'in_progress',
    progress_bp: overrides.progress_bp ?? 0,
    started_at: overrides.started_at ?? null,
    completed_at: overrides.completed_at ?? null,
    last_accessed_at: overrides.last_accessed_at ?? null,
    courses: course,
  };
}

function createStats(overrides: Partial<ViewerStats> = {}): ViewerStats {
  return {
    current_streak: overrides.current_streak ?? 0,
    longest_streak: overrides.longest_streak ?? 0,
    courses_completed: overrides.courses_completed ?? 0,
    lessons_completed: overrides.lessons_completed ?? 0,
    total_xp: overrides.total_xp ?? 0,
    total_study_minutes: overrides.total_study_minutes ?? 0,
    last_activity_date: overrides.last_activity_date ?? null,
  };
}

describe('homeDashboard', () => {
  it('sorts in-progress enrollments by last access, started time, then progress', () => {
    const newest = createEnrollment({
      course_id: 'course-new',
      courses: createCourse({ id: 'course-new', title: 'Newest' }),
      last_accessed_at: '2026-04-04T10:30:00Z',
      progress_bp: 1500,
    });
    const fallbackByStarted = createEnrollment({
      course_id: 'course-started',
      courses: createCourse({ id: 'course-started', title: 'Started' }),
      started_at: '2026-04-03T09:00:00Z',
      progress_bp: 8000,
    });
    const fallbackByProgress = createEnrollment({
      course_id: 'course-progress',
      courses: createCourse({ id: 'course-progress', title: 'Progress' }),
      progress_bp: 6800,
    });
    const ignored = createEnrollment({
      course_id: 'course-completed',
      courses: createCourse({ id: 'course-completed', title: 'Completed' }),
      status: 'completed',
      progress_bp: 10000,
    });

    expect(
      sortHomeInProgressEnrollments([fallbackByProgress, ignored, fallbackByStarted, newest]).map(
        (entry) => entry.course_id,
      ),
    ).toEqual(['course-new', 'course-started', 'course-progress']);
  });

  it('targets the first unfinished lesson and falls back to the course page when complete', () => {
    const enrollment = createEnrollment({
      course_id: 'course-1',
      courses: createCourse({ id: 'course-1', title: 'Signals' }),
    });

    expect(
      getHomeContinueTarget(enrollment, {
        course: enrollment.courses,
        lessons: [
          { id: 'lesson-1', title: 'Intro', sort_key: 0, duration_seconds: 300 },
          { id: 'lesson-2', title: 'Review', sort_key: 1, duration_seconds: 480 },
        ],
        completed_lesson_ids: ['lesson-1'],
      }),
    ).toMatchObject({
      kind: 'lesson',
      href: '/lesson/lesson-2',
      label: '继续下一课',
      lessonTitle: 'Review',
    });

    expect(
      getHomeContinueTarget(enrollment, {
        course: enrollment.courses,
        lessons: [
          { id: 'lesson-1', title: 'Intro', sort_key: 0, duration_seconds: 300 },
          { id: 'lesson-2', title: 'Review', sort_key: 1, duration_seconds: 480 },
        ],
        completed_lesson_ids: ['lesson-1', 'lesson-2'],
      }),
    ).toMatchObject({
      kind: 'course',
      href: '/course/course-1',
      label: '回顾课程',
    });
  });

  it('derives coach messaging for empty, early, and late progress states', () => {
    const lowEnrollment = createEnrollment({
      course_id: 'course-low',
      progress_bp: 1200,
      courses: createCourse({ id: 'course-low', title: 'Biology Warmup' }),
    });
    const highEnrollment = createEnrollment({
      course_id: 'course-high',
      progress_bp: 9000,
      courses: createCourse({ id: 'course-high', title: 'Physics Finish Line' }),
    });

    const emptyState = buildHomeCoachState({
      stats: createStats({ current_streak: 4, lessons_completed: 2, total_xp: 120 }),
      selectedCourse: null,
      continueTarget: {
        kind: 'library',
        href: '/library',
        label: '浏览课程',
        supportingLabel: '先选一门课程',
        lessonTitle: null,
      },
    });
    expect(emptyState.accentLabel).toBe('先起步');
    expect(emptyState.title).toContain('先挑一门');
    expect(emptyState.supportingNote).toContain('连续学习 4 天');

    const lowSelectedCourse = getHomeSelectedCourse(lowEnrollment, {
      course: lowEnrollment.courses,
      lessons: [{ id: 'lesson-1', title: 'Warm intro', sort_key: 0, duration_seconds: 300 }],
      completed_lesson_ids: [],
    });
    const lowState = buildHomeCoachState({
      stats: createStats({ current_streak: 1 }),
      selectedCourse: lowSelectedCourse,
      continueTarget: {
        kind: 'lesson',
        href: '/lesson/lesson-1',
        label: '继续下一课',
        supportingLabel: 'Warm intro',
        lessonTitle: 'Warm intro',
      },
    });
    expect(lowState.accentLabel).toBe('先起步');
    expect(lowState.message).toContain('先完成一节课');

    const highSelectedCourse = getHomeSelectedCourse(highEnrollment, {
      course: highEnrollment.courses,
      lessons: [
        { id: 'lesson-1', title: 'Wrap up', sort_key: 0, duration_seconds: 300 },
        { id: 'lesson-2', title: 'Final check', sort_key: 1, duration_seconds: 480 },
      ],
      completed_lesson_ids: ['lesson-1'],
    });
    const highState = buildHomeCoachState({
      stats: createStats({ current_streak: 5, lessons_completed: 8, total_xp: 800 }),
      selectedCourse: highSelectedCourse,
      continueTarget: {
        kind: 'lesson',
        href: '/lesson/lesson-2',
        label: '继续下一课',
        supportingLabel: 'Final check',
        lessonTitle: 'Final check',
      },
    });
    expect(highState.accentLabel).toBe('冲刺完成');
    expect(highState.title).toContain('收尾');
    expect(highState.supportingNote).toContain('连续 5 天');
  });
});
