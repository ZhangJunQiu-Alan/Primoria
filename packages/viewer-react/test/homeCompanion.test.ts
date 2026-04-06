import { getAiTutorPersonaDefinition } from '@/shared/ai-tutor/persona';
import type { ViewerCourse } from '@/shared/api/viewer/types';
import {
  getHomeCompanionInsight,
  getHomeCompanionPlacement,
  rankHomeCompanionRecommendations,
} from '@/features/home/homeCompanion';

describe('homeCompanion helpers', () => {
  const persona = getAiTutorPersonaDefinition('coach', 'zh-CN');
  const baseCourse: ViewerCourse = {
    id: 'course-current',
    title: '当前课程',
    slug: 'current-course',
    description: '',
    thumbnail_url: null,
    content_language: 'zh-CN',
    difficulty_level: 'beginner',
    estimated_minutes: 40,
    tags: [],
    subject_id: 'subject-a',
    subjects: { id: 'subject-a', name: 'Physics', color_hex: '#7a9e7e' },
    published_at: '2026-04-01T00:00:00Z',
  };

  it('returns a review reminder when the learner has been inactive for more than seven days', () => {
    const now = Date.parse('2026-04-06T12:00:00Z');
    const insight = getHomeCompanionInsight({
      persona,
      now,
      stats: { current_streak: 0, longest_streak: 0, courses_completed: 0, lessons_completed: 0, total_xp: 0, total_study_minutes: 0, last_activity_date: '2026-03-28' },
      selectedCourse: {
        enrollment: {
          course_id: baseCourse.id,
          status: 'in_progress',
          progress_bp: 4200,
          last_accessed_at: '2026-03-28T09:00:00Z',
          courses: baseCourse,
        },
        course: baseCourse,
        progressPct: 42,
        difficultyLabel: '入门',
        estimatedLabel: '40 分钟',
        lastAccessedLabel: '2026-03-28',
        nextLessonTitle: '第二课',
        nextLessonDurationLabel: '15 分钟',
        completedLessons: 1,
        totalLessons: 4,
      },
    });

    expect(insight.kind).toBe('review');
    expect(insight.message).toContain('停了');
  });

  it('places the companion popover to the right when there is not enough space on the left', () => {
    const placement = getHomeCompanionPlacement({
      containerWidth: 1200,
      containerHeight: 760,
      anchorX: 48,
      anchorY: 180,
      anchorWidth: 280,
      anchorHeight: 360,
      popoverWidth: 320,
      popoverHeight: 340,
      viewportWidth: 1440,
    });

    expect(placement.anchor).toBe('right');
    expect(placement.x).toBeGreaterThan(placement.y - 1);
  });

  it('ranks harder recommendations ahead of the current course', () => {
    const current = baseCourse;
    const medium = {
      ...baseCourse,
      id: 'course-medium',
      title: '进阶课程',
      difficulty_level: 'intermediate',
      estimated_minutes: 48,
    };
    const hard = {
      ...baseCourse,
      id: 'course-hard',
      title: '挑战课程',
      difficulty_level: 'advanced',
      estimated_minutes: 58,
    };
    const otherSubject = {
      ...baseCourse,
      id: 'course-other',
      title: '别的学科',
      difficulty_level: 'advanced',
      subject_id: 'subject-b',
      subjects: { id: 'subject-b', name: 'Biology', color_hex: '#7a9e7e' },
    };

    const ranked = rankHomeCompanionRecommendations([current, medium, hard, otherSubject], {
      subjectId: current.subject_id,
      recommendFromId: current.id,
      pace: 'harder',
    });

    expect(ranked[0]?.id).toBe('course-medium');
    expect(ranked[1]?.id).toBe('course-hard');
    expect(ranked.at(-1)?.id).toBe('course-current');
  });
});
