import { type Course, CourseSchema } from '../course/course';
import { SCHEMA_VERSION } from '../course/version';

/**
 * Normalise a raw imported JSON object to the canonical Course shape.
 *
 * Handles all legacy key aliases documented in course-json-guide.md:
 * - camelCase top-level keys → snake_case
 * - legacy `pages` array at top level → `lessons`
 * - legacy `lessonId` → `lesson_id`, `pageId` → `page_id`
 * - legacy block type aliases (codeBlock, functionFlow, etc.)
 * - legacy visibilityRule aliases
 */
export function migrateCourseJson(raw: Record<string, unknown>): Record<string, unknown> {
  const out = { ...raw };

  // schema_version
  if (!out['schema_version'] && out['schemaVersion']) {
    out['schema_version'] = out['schemaVersion'];
  }
  out['schema_version'] ??= SCHEMA_VERSION;

  // course_id
  if (!out['course_id'] && out['courseId']) {
    out['course_id'] = out['courseId'];
    delete out['courseId'];
  }

  // metadata aliases
  if (out['metadata'] && typeof out['metadata'] === 'object') {
    const meta = { ...(out['metadata'] as Record<string, unknown>) };
    if (!meta['difficulty_level'] && meta['difficulty']) {
      meta['difficulty_level'] = meta['difficulty'];
      delete meta['difficulty'];
    }
    if (!meta['estimated_minutes'] && meta['estimatedMinutes']) {
      meta['estimated_minutes'] = meta['estimatedMinutes'];
      delete meta['estimatedMinutes'];
    }
    out['metadata'] = meta;
  }

  // top-level `pages` → `lessons`
  if (!out['lessons'] && Array.isArray(out['pages'])) {
    out['lessons'] = out['pages'];
    delete out['pages'];
  }

  // lessons normalization
  if (Array.isArray(out['lessons'])) {
    out['lessons'] = (out['lessons'] as Record<string, unknown>[]).map(migrateLesson);
  }

  return out;
}

function migrateLesson(raw: Record<string, unknown>): Record<string, unknown> {
  const lesson = { ...raw };

  // lesson_id
  if (!lesson['lesson_id'] && lesson['lessonId']) {
    lesson['lesson_id'] = lesson['lessonId'];
    delete lesson['lessonId'];
  }
  if (!lesson['lesson_id'] && lesson['pageId']) {
    lesson['lesson_id'] = lesson['pageId'];
    delete lesson['pageId'];
  }

  // legacy flat blocks array → wrap in a single page
  if (Array.isArray(lesson['blocks']) && !Array.isArray(lesson['pages'])) {
    lesson['pages'] = [
      {
        page_id: `page-${lesson['lesson_id'] as string}-0`,
        order: 0,
        blocks: (lesson['blocks'] as Record<string, unknown>[]).map(migrateBlock),
      },
    ];
    delete lesson['blocks'];
  } else if (Array.isArray(lesson['pages'])) {
    lesson['pages'] = (lesson['pages'] as Record<string, unknown>[]).map(migratePage);
  }

  return lesson;
}

function migratePage(raw: Record<string, unknown>): Record<string, unknown> {
  const page = { ...raw };

  if (!page['page_id'] && page['pageId']) {
    page['page_id'] = page['pageId'];
    delete page['pageId'];
  }

  if (Array.isArray(page['blocks'])) {
    page['blocks'] = (page['blocks'] as Record<string, unknown>[]).map(migrateBlock);
  }

  return page;
}

const BLOCK_TYPE_ALIASES: Record<string, string> = {
  codeBlock: 'code-block',
  code_block: 'code-block',
  codePlayground: 'code-playground',
  code_playground: 'code-playground',
  codeExecution: 'code-execution',
  code_execution: 'code-execution',
  functionFlow: 'function-flow',
  function_flow: 'function-flow',
  multipleChoice: 'multiple-choice',
  multiple_choice: 'multiple-choice',
  fillBlank: 'fill-blank',
  fill_blank: 'fill-blank',
  trueFalse: 'true-false',
  true_false: 'true-false',
  animation: 'interactive-visual',
  animationBlock: 'interactive-visual',
  interactiveVisual: 'interactive-visual',
  interactive_visual: 'interactive-visual',
};

const VISIBILITY_ALIASES: Record<string, string> = {
  after_previous_correct: 'afterPreviousCorrect',
  'after-previous-correct': 'afterPreviousCorrect',
};

function migrateBlock(raw: Record<string, unknown>): Record<string, unknown> {
  const block = { ...raw };
  const rawType = typeof block['type'] === 'string' ? block['type'] : null;

  // type aliases
  if (rawType && BLOCK_TYPE_ALIASES[rawType]) {
    block['type'] = BLOCK_TYPE_ALIASES[rawType];
  }

  // visibilityRule aliases
  if (
    typeof block['visibilityRule'] === 'string' &&
    VISIBILITY_ALIASES[block['visibilityRule']]
  ) {
    block['visibilityRule'] = VISIBILITY_ALIASES[block['visibilityRule']];
  }

  if (rawType === 'animation' || rawType === 'animationBlock') {
    block['content'] = migrateLegacyAnimationContent(block['content']);
  }

  return block;
}

function migrateLegacyAnimationContent(raw: unknown): Record<string, unknown> {
  const content =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const customHtml = typeof content['customHtml'] === 'string' ? content['customHtml'] : undefined;
  const aiPrompt = typeof content['aiPrompt'] === 'string' ? content['aiPrompt'] : undefined;

  return {
    version: 'sim-v1',
    mode: 'presentation',
    template: 'generic',
    title: 'Interactive Visual',
    layoutPreset: 'scene-only',
    themeTone: 'light-science',
    initialState: {},
    controls: [],
    formulas: [],
    scene: {},
    ...(aiPrompt ? { aiPrompt } : {}),
    ...(customHtml ? { legacyCustomHtml: customHtml } : {}),
  };
}

/**
 * Parse and validate a raw course JSON, applying all migrations first.
 * Returns a fully typed Course or throws a ZodError.
 */
export function parseCourse(raw: unknown): Course {
  const migrated = migrateCourseJson(raw as Record<string, unknown>);
  return CourseSchema.parse(migrated);
}

export type { Course };
