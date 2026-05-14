import { describe, it, expect } from 'vitest';
import { migrateCourseJson, parseCourse } from '../src/migrations/index';
import {
  FIXTURE_LEGACY_COURSE_RAW,
  FIXTURE_MINIMAL_COURSE,
} from '../src/fixtures/index';
import { SCHEMA_VERSION } from '../src/course/version';

describe('migrateCourseJson', () => {
  it('promotes camelCase top-level keys to snake_case', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    expect(result['course_id']).toBe('fixture-legacy');
    expect(result['courseId']).toBeUndefined();
  });

  it('promotes legacy `pages` array to `lessons`', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    expect(Array.isArray(result['lessons'])).toBe(true);
    expect(result['pages']).toBeUndefined();
  });

  it('migrates metadata.difficulty → difficulty_level', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    const meta = result['metadata'] as Record<string, unknown>;
    expect(meta['difficulty_level']).toBe('beginner');
    expect(meta['difficulty']).toBeUndefined();
  });

  it('migrates metadata.estimatedMinutes → estimated_minutes', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    const meta = result['metadata'] as Record<string, unknown>;
    expect(meta['estimated_minutes']).toBe(15);
    expect(meta['estimatedMinutes']).toBeUndefined();
  });

  it('migrates lesson.lessonId → lesson_id', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    const lessons = result['lessons'] as Record<string, unknown>[];
    expect(lessons[0]['lesson_id']).toBe('lesson-1');
    expect(lessons[0]['lessonId']).toBeUndefined();
  });

  it('wraps flat blocks array into a pages array', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    const lessons = result['lessons'] as Record<string, unknown>[];
    const pages = lessons[0]['pages'] as Record<string, unknown>[];
    expect(Array.isArray(pages)).toBe(true);
    expect(pages[0]['page_id']).toBe('page-lesson-1-0');
    expect(lessons[0]['blocks']).toBeUndefined();
  });

  it('migrates block type alias codeBlock → code-block', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    const lessons = result['lessons'] as Record<string, unknown>[];
    const pages = lessons[0]['pages'] as Record<string, unknown>[];
    const blocks = pages[0]['blocks'] as Record<string, unknown>[];
    expect(blocks[0]['type']).toBe('code-block');
  });

  it('migrates block type alias multipleChoice → multiple-choice', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    const lessons = result['lessons'] as Record<string, unknown>[];
    const pages = lessons[0]['pages'] as Record<string, unknown>[];
    const blocks = pages[0]['blocks'] as Record<string, unknown>[];
    expect(blocks[1]['type']).toBe('multiple-choice');
  });

  it('migrates visibilityRule alias after_previous_correct → always', () => {
    const result = migrateCourseJson(FIXTURE_LEGACY_COURSE_RAW);
    const lessons = result['lessons'] as Record<string, unknown>[];
    const pages = lessons[0]['pages'] as Record<string, unknown>[];
    const blocks = pages[0]['blocks'] as Record<string, unknown>[];
    expect(blocks[1]['visibilityRule']).toBe('always');
  });

  it('migrates legacy animation blocks to interactive-visual blocks', () => {
    const result = migrateCourseJson({
      course_id: 'legacy-animation',
      metadata: { title: 'Legacy Animation' },
      lessons: [
        {
          lesson_id: 'lesson-1',
          title: 'Lesson 1',
          pages: [
            {
              page_id: 'page-1',
              order: 0,
              blocks: [
                {
                  id: 'b-anim',
                  type: 'animation',
                  position: { order: 0 },
                  content: {
                    aiPrompt: 'Show a pendulum.',
                    customHtml: '<canvas></canvas>',
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const lessons = result['lessons'] as Record<string, unknown>[];
    const pages = lessons[0]['pages'] as Record<string, unknown>[];
    const blocks = pages[0]['blocks'] as Record<string, unknown>[];
    const content = blocks[0]['content'] as Record<string, unknown>;

    expect(blocks[0]['type']).toBe('interactive-visual');
    expect(content['template']).toBe('generic');
    expect(content['generatedHtml']).toBe('<canvas></canvas>');
    expect(content['aiPrompt']).toBe('Show a pendulum.');
  });

  it('injects schema_version if missing', () => {
    const result = migrateCourseJson({ courseId: 'x', metadata: { title: 'X' }, lessons: [] });
    expect(result['schema_version']).toBe(SCHEMA_VERSION);
  });

  it('is a no-op on already-canonical input', () => {
    const input = {
      schema_version: SCHEMA_VERSION,
      course_id: 'c1',
      metadata: { title: 'T' },
      lessons: [],
    };
    const result = migrateCourseJson(input);
    expect(result['course_id']).toBe('c1');
    expect(result['schema_version']).toBe(SCHEMA_VERSION);
  });
});

describe('parseCourse', () => {
  it('parses a valid canonical course without throwing', () => {
    expect(() => parseCourse(FIXTURE_MINIMAL_COURSE)).not.toThrow();
  });

  it('returns correct schema_version', () => {
    const course = parseCourse(FIXTURE_MINIMAL_COURSE);
    expect(course.schema_version).toBe(SCHEMA_VERSION);
  });

  it('migrates legacy input and parses successfully', () => {
    expect(() => parseCourse(FIXTURE_LEGACY_COURSE_RAW)).not.toThrow();
  });

  it('throws ZodError for invalid input', () => {
    expect(() => parseCourse({ course_id: 'bad' })).toThrow();
  });
});
