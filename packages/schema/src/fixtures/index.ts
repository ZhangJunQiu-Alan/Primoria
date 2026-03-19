import { type Course } from '../course/course';
import { SCHEMA_VERSION } from '../course/version';

// ─── Minimal valid course ─────────────────────────────────────────────────────

export const FIXTURE_MINIMAL_COURSE: Course = {
  $schema: 'https://primoria.com/course-schema/v1.json',
  schema_version: SCHEMA_VERSION,
  course_id: 'fixture-minimal',
  metadata: { title: 'Minimal Course' },
  lessons: [
    {
      lesson_id: 'lesson-1',
      title: 'Lesson 1',
      pages: [
        {
          page_id: 'page-1-0',
          order: 0,
          blocks: [],
        },
      ],
    },
  ],
};

// ─── Course with all block types ──────────────────────────────────────────────

export const FIXTURE_ALL_BLOCKS_COURSE: Course = {
  $schema: 'https://primoria.com/course-schema/v1.json',
  schema_version: SCHEMA_VERSION,
  course_id: 'fixture-all-blocks',
  metadata: {
    title: 'All Blocks Course',
    description: 'One block of each type',
    difficulty_level: 'intermediate',
    estimated_minutes: 30,
  },
  lessons: [
    {
      lesson_id: 'lesson-1',
      title: 'All Block Types',
      pages: [
        {
          page_id: 'page-1-0',
          order: 0,
          blocks: [
            {
              id: 'b-text',
              type: 'text',
              position: { order: 0 },
              content: { format: 'richtext', value: { ops: [{ insert: 'Hello World\n' }] } },
            },
            {
              id: 'b-image',
              type: 'image',
              position: { order: 1 },
              content: { altText: 'Sample image' },
            },
            {
              id: 'b-code-block',
              type: 'code-block',
              position: { order: 2 },
              content: { language: 'python', code: 'print("hello")' },
            },
            {
              id: 'b-code-playground',
              type: 'code-playground',
              position: { order: 3 },
              content: { language: 'python', starterCode: '# write your code here' },
            },
            {
              id: 'b-code-execution',
              type: 'code-execution',
              position: { order: 4 },
              content: { language: 'python', code: 'print(1 + 1)' },
            },
            {
              id: 'b-function-flow',
              type: 'function-flow',
              position: { order: 5 },
              content: { nodes: [], edges: [] },
            },
            {
              id: 'b-mc',
              type: 'multiple-choice',
              position: { order: 6 },
              content: {
                question: 'What is 2+2?',
                options: [
                  { id: 'opt-a', text: '3', isCorrect: false },
                  { id: 'opt-b', text: '4', isCorrect: true },
                ],
              },
            },
            {
              id: 'b-fill-blank',
              type: 'fill-blank',
              position: { order: 7 },
              content: {
                template: 'The sky is ___.',
                blanks: [{ id: 'blank-1', answer: 'blue' }],
              },
            },
            {
              id: 'b-true-false',
              type: 'true-false',
              position: { order: 8 },
              content: { statement: 'The earth is flat.', isTrue: false },
            },
            {
              id: 'b-matching',
              type: 'matching',
              position: { order: 9 },
              content: {
                pairs: [{ id: 'p1', left: 'Cat', right: 'Meow' }],
              },
            },
            {
              id: 'b-animation',
              type: 'animation',
              position: { order: 10 },
              content: { preset: 'bubble-sort' },
            },
            {
              id: 'b-interactive-visual',
              type: 'interactive-visual',
              position: { order: 11 },
              content: { template: 'pendulum', title: 'Simple Pendulum' },
            },
            {
              id: 'b-video',
              type: 'video',
              position: { order: 12 },
              content: { provider: 'youtube' },
            },
          ],
        },
      ],
    },
  ],
};

// ─── Legacy format samples (pre-migration) ────────────────────────────────────

/** A course JSON using camelCase / legacy key aliases — should survive migrateCourseJson(). */
export const FIXTURE_LEGACY_COURSE_RAW: Record<string, unknown> = {
  schemaVersion: '0.9',
  courseId: 'fixture-legacy',
  metadata: {
    title: 'Legacy Format',
    difficulty: 'beginner',
    estimatedMinutes: 15,
  },
  pages: [
    {
      lessonId: 'lesson-1',
      title: 'Old Lesson',
      blocks: [
        {
          id: 'b1',
          type: 'codeBlock',
          position: { order: 0 },
          content: { language: 'js', code: 'console.log("hi")' },
        },
        {
          id: 'b2',
          type: 'multipleChoice',
          position: { order: 1 },
          visibilityRule: 'after_previous_correct',
          content: {
            question: 'Q?',
            options: [{ id: 'a', text: 'Yes', isCorrect: true }],
          },
        },
      ],
    },
  ],
};

/** Expected shape after migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW). */
export const FIXTURE_LEGACY_COURSE_MIGRATED_SHAPE = {
  course_id: 'fixture-legacy',
  metadata: {
    title: 'Legacy Format',
    difficulty_level: 'beginner',
    estimated_minutes: 15,
  },
  lessons: [
    {
      lesson_id: 'lesson-1',
      title: 'Old Lesson',
      pages: [
        {
          blocks: [
            { id: 'b1', type: 'code-block' },
            { id: 'b2', type: 'multiple-choice', visibilityRule: 'afterPreviousCorrect' },
          ],
        },
      ],
    },
  ],
};
