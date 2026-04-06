import { describe, expect, it } from 'vitest';
import type { ViewerCourse, ViewerEnrollment, ViewerHomeLesson } from '@/shared/api/viewer/types';
import { getHomeContinueTarget, getHomeSelectedCourse, sortHomeInProgressEnrollments } from '@/features/home/homeDashboard';

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

function createLesson(overrides: Partial<ViewerHomeLesson> = {}): ViewerHomeLesson {
  return {
    id: overrides.id ?? 'lesson-1',
    title: overrides.title ?? 'Lesson',
    sort_key: overrides.sort_key ?? 0,
    xp_reward: overrides.xp_reward ?? 120,
    duration_seconds: overrides.duration_seconds ?? 300,
    is_locked: overrides.is_locked ?? false,
    unlock_type: overrides.unlock_type ?? 'none',
  };
}

describe('homeDashboard', () => {
  const language = 'zh-CN' as const;

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
      getHomeContinueTarget(enrollment, language, {
        course: enrollment.courses,
        lessons: [
          createLesson({ id: 'lesson-1', title: 'Intro', sort_key: 0, duration_seconds: 300 }),
          createLesson({ id: 'lesson-2', title: 'Review', sort_key: 1, duration_seconds: 480 }),
        ],
        completed_lesson_ids: ['lesson-1'],
        enrollment,
      }),
    ).toMatchObject({
      kind: 'lesson',
      href: '/lesson/lesson-2',
      label: '继续下一课',
      lessonTitle: 'Review',
    });

    expect(
      getHomeContinueTarget(enrollment, language, {
        course: enrollment.courses,
        lessons: [
          createLesson({ id: 'lesson-1', title: 'Intro', sort_key: 0, duration_seconds: 300 }),
          createLesson({ id: 'lesson-2', title: 'Review', sort_key: 1, duration_seconds: 480 }),
        ],
        completed_lesson_ids: ['lesson-1', 'lesson-2'],
        enrollment,
      }),
    ).toMatchObject({
      kind: 'course',
      href: '/course/course-1',
      label: '回顾课程',
    });
  });

  it('builds selected course progress details from the aggregated course payload', () => {
    const enrollment = createEnrollment({
      course_id: 'course-low',
      progress_bp: 1200,
      courses: createCourse({ id: 'course-low', title: 'Biology Warmup' }),
    });

    const selectedCourse = getHomeSelectedCourse(enrollment, language, {
      course: enrollment.courses,
      lessons: [
        createLesson({ id: 'lesson-1', title: 'Warm intro', sort_key: 0, duration_seconds: 300 }),
        createLesson({ id: 'lesson-2', title: 'Checkpoint', sort_key: 1, duration_seconds: 540 }),
      ],
      completed_lesson_ids: ['lesson-1'],
      enrollment,
    });

    expect(selectedCourse).toMatchObject({
      progressPct: 12,
      completedLessons: 1,
      totalLessons: 2,
      nextLessonTitle: 'Checkpoint',
      nextLessonDurationLabel: '9 分钟',
      difficultyLabel: '入门',
      estimatedLabel: '25 分钟',
    });
  });
});
