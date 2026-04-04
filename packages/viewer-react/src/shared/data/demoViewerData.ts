import { SCHEMA_VERSION, type Course } from '@primoria/schema';
import type { LessonRuntimeData } from '@/shared/lesson/types';

export type DemoSubject = {
  id: string;
  name: string;
  color_hex: string;
};

export type DemoCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  difficulty_level: string;
  estimated_minutes: number;
  tags: string[];
  subject_id: string;
  subjects: DemoSubject;
  published_at: string;
};

export type DemoEnrollment = {
  course_id: string;
  status: string;
  progress_bp: number;
  courses: DemoCourse;
};

export type DemoProfile = {
  id: string;
  username: string;
  bio: string;
  avatar_url: string;
  cover_image_url: string;
  role: string;
  created_at: string;
  pinned_achievement_ids: string[];
};

export type DemoAchievement = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  earned_at: string | null;
};

export type DemoParentChild = {
  child_id: string;
  child_name: string;
  role: string;
  current_streak: number;
  total_xp: number;
  lessons_completed: number;
};

export const demoSubjects: DemoSubject[] = [
  { id: 'subject-physics', name: 'Physics', color_hex: '#4F46E5' },
  { id: 'subject-cs', name: 'Computer Science', color_hex: '#0EA5E9' },
];

export const demoCourseSnapshot: Course = {
  $schema: 'https://primoria.com/course-schema/v1.json',
  schema_version: SCHEMA_VERSION,
  course_id: 'course-demo-react-viewer',
  metadata: {
    title: 'React Viewer Foundations',
    description: 'A demo course that exercises the rebuilt learner runtime.',
    difficulty_level: 'beginner',
    estimated_minutes: 22,
    tags: ['react', 'viewer', 'migration'],
  },
  lessons: [
    {
      lesson_id: 'lesson-demo-1',
      title: 'Foundations',
      pages: [
        {
          page_id: 'page-demo-1',
          order: 0,
          blocks: [
            {
              id: 'intro',
              type: 'text',
              position: { order: 0 },
              content: {
                format: 'richtext',
                value: { ops: [{ insert: 'Welcome to the React learner runtime.\n' }] },
              },
            },
            {
              id: 'mc',
              type: 'multiple-choice',
              position: { order: 1 },
              visibilityRule: 'always',
              content: {
                question: 'Which stack powers the new learner app?',
                options: [
                  { id: 'a', text: 'React + TypeScript + Vite', isCorrect: true },
                  { id: 'b', text: 'Flutter only', isCorrect: false },
                ],
              },
            },
            {
              id: 'gated',
              type: 'text',
              position: { order: 2 },
              visibilityRule: 'afterPreviousCorrect',
              content: {
                format: 'richtext',
                value: { ops: [{ insert: 'The gated block is now visible.\n' }] },
              },
            },
          ],
        },
        {
          page_id: 'page-demo-2',
          order: 1,
          blocks: [
            {
              id: 'multi',
              type: 'multiple-choice',
              position: { order: 0 },
              content: {
                question: 'Which features belong to the learner shell?',
                allowMultiple: true,
                options: [
                  { id: 'a', text: 'Library', isCorrect: true },
                  { id: 'b', text: 'Community', isCorrect: true },
                  { id: 'c', text: 'Course editor canvas', isCorrect: false },
                ],
              },
            },
            {
              id: 'fill',
              type: 'fill-blank',
              position: { order: 1 },
              content: {
                template: 'The React viewer remains ___ first.',
                blanks: [{ id: 'blank-1', answer: 'web', alternatives: ['web-first'] }],
              },
            },
            {
              id: 'matching',
              type: 'matching',
              position: { order: 2 },
              content: {
                pairs: [
                  { id: 'pair-1', left: 'Home', right: 'Progress' },
                  { id: 'pair-2', left: 'Library', right: 'Catalog' },
                ],
              },
            },
            {
              id: 'video',
              type: 'video',
              position: { order: 3 },
              content: {
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                provider: 'youtube',
              },
            },
          ],
        },
      ],
    },
    {
      lesson_id: 'lesson-demo-2',
      title: 'Advanced Demo Blocks',
      pages: [
        {
          page_id: 'page-demo-3',
          order: 0,
          blocks: [
            {
              id: 'code',
              type: 'code-playground',
              position: { order: 0 },
              content: {
                language: 'ts',
                starterCode: 'const viewer = "react";',
                initialCode: 'const viewer = "react";',
              },
            },
            {
              id: 'visual',
              type: 'interactive-visual',
              position: { order: 1 },
              content: {
                template: 'sorting-bars',
                title: 'Sorting bars',
              },
            },
          ],
        },
      ],
    },
  ],
};

export const demoCourses: DemoCourse[] = [
  {
    id: demoCourseSnapshot.course_id,
    title: demoCourseSnapshot.metadata.title,
    slug: 'react-viewer-foundations',
    description: demoCourseSnapshot.metadata.description ?? '',
    thumbnail_url: null,
    difficulty_level: demoCourseSnapshot.metadata.difficulty_level ?? 'beginner',
    estimated_minutes: demoCourseSnapshot.metadata.estimated_minutes ?? 20,
    tags: demoCourseSnapshot.metadata.tags ?? [],
    subject_id: demoSubjects[0].id,
    subjects: demoSubjects[0],
    published_at: '2026-03-01T00:00:00Z',
  },
];

export const demoEnrollments: DemoEnrollment[] = [
  {
    course_id: demoCourseSnapshot.course_id,
    status: 'in_progress',
    progress_bp: 5200,
    courses: demoCourses[0],
  },
];

export const demoProfile: DemoProfile = {
  id: 'demo-user',
  username: 'Demo Learner',
  bio: 'Using the local viewer fixture mode.',
  avatar_url: '',
  cover_image_url: '',
  role: 'user',
  created_at: '2026-01-15T00:00:00Z',
  pinned_achievement_ids: ['achievement-streak'],
};

export const demoAchievements: DemoAchievement[] = [
  {
    id: 'achievement-streak',
    slug: 'streak_7',
    name: 'Hot Streak',
    description: 'Keep a 7-day learning streak alive.',
    category: 'streak',
    rarity: 'rare',
    earned_at: '2026-03-10T10:00:00Z',
  },
  {
    id: 'achievement-first-course',
    slug: 'first_course',
    name: 'Feedback Loop',
    description: 'Complete your first course.',
    category: 'learning',
    rarity: 'common',
    earned_at: null,
  },
];

export const demoStats = {
  current_streak: 9,
  longest_streak: 14,
  courses_completed: 1,
  lessons_completed: 6,
  total_xp: 1320,
  total_study_minutes: 186,
};

export const demoFollowCounts = {
  following: 8,
  followers: 13,
};

export const demoXpHistory = new Map<string, number>([
  ['2026-03-24', 80],
  ['2026-03-25', 120],
  ['2026-03-26', 160],
  ['2026-03-27', 0],
  ['2026-03-28', 220],
  ['2026-03-29', 180],
  ['2026-03-30', 140],
]);

export const demoParentChildren: DemoParentChild[] = [
  {
    child_id: 'demo-child-1',
    child_name: 'Ava',
    role: 'user',
    current_streak: 6,
    total_xp: 840,
    lessons_completed: 11,
  },
  {
    child_id: 'demo-child-2',
    child_name: 'Noah',
    role: 'user',
    current_streak: 3,
    total_xp: 520,
    lessons_completed: 7,
  },
];

export const demoParentReports: Record<string, Record<string, unknown>> = {
  'demo-child-1': {
    child_id: 'demo-child-1',
    summary: {
      study_minutes: 142,
      lessons_completed: 11,
      streak: 6,
      top_subject: 'Physics',
    },
    daily_breakdown: [
      { date: '2026-03-24', minutes: 24, xp: 120 },
      { date: '2026-03-25', minutes: 18, xp: 80 },
      { date: '2026-03-26', minutes: 30, xp: 140 },
    ],
  },
  'demo-child-2': {
    child_id: 'demo-child-2',
    summary: {
      study_minutes: 88,
      lessons_completed: 7,
      streak: 3,
      top_subject: 'Computer Science',
    },
    daily_breakdown: [
      { date: '2026-03-24', minutes: 10, xp: 40 },
      { date: '2026-03-25', minutes: 22, xp: 100 },
      { date: '2026-03-26', minutes: 18, xp: 60 },
    ],
  },
};

export function createDemoLessonRuntime(lessonId: string): LessonRuntimeData | null {
  const lesson = demoCourseSnapshot.lessons.find((candidate) => candidate.lesson_id === lessonId);
  if (!lesson) {
    return null;
  }

  return {
    lessonId: lesson.lesson_id,
    courseId: demoCourseSnapshot.course_id,
    title: lesson.title,
    pages: lesson.pages.map((page) => ({
      page_id: page.page_id,
      order: page.order,
      title: page.page_id,
      blocks: page.blocks,
    })),
    xpReward: 120,
    durationSeconds: 600,
  };
}
