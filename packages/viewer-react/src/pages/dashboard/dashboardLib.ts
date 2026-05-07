import { formatViewerDate, formatViewerWeekday } from '@/shared/i18n/format';
import type { CourseLessonRow, CourseRow } from '@/queries/courses';
import type {
  AICourseDraftFormState,
  AICourseDraftPace,
  AICourseDraftPreview,
  CourseWorkflowStatus,
  CourseFormPayload,
  CourseFormState,
  DashboardTab,
} from '@/pages/dashboard/dashboardTypes';

export const emptyCourseForm: CourseFormState = {
  title: '',
  description: '',
  thumbnailUrl: '',
  difficultyLevel: 'beginner',
  estimatedHours: '',
  priceTier: 'free',
  price: '',
};

export const emptyAICourseDraftForm: AICourseDraftFormState = {
  topic: '',
  audience: '',
  outcome: '',
  pace: 'balanced',
};

export function parseDashboardTab(value: string | null): DashboardTab {
  switch (value) {
    case 'course':
    case 'data':
      return value;
    case 'fans':
      return 'data';
    default:
      return 'home';
  }
}

export function buildAICourseDraftPreview(form: AICourseDraftFormState): AICourseDraftPreview {
  const topic = form.topic.trim() || 'AI-assisted course draft';
  const audience = form.audience.trim() || 'beginner learners';
  const outcome = form.outcome.trim() || 'build confidence through a short guided sequence';

  const paceCopy: Record<
    AICourseDraftPace,
    {
      label: string;
      modules: [string, string, string];
      note: string;
    }
  > = {
    quick: {
      label: 'quick-start',
      modules: ['Orientation and first win', 'Guided drill', 'Checkpoint recap'],
      note: 'Designed for a fast first version that gets learners into action quickly.',
    },
    balanced: {
      label: 'balanced',
      modules: ['Foundations and context', 'Worked example + guided practice', 'Checkpoint and reflection'],
      note: 'Balanced for a clear explanation, one practice pass, and a compact review loop.',
    },
    deep: {
      label: 'deep-dive',
      modules: ['Mental model and core concepts', 'Scenario practice lab', 'Review, transfer, and extension'],
      note: 'Structured for a denser learning arc with more explanation and transfer practice.',
    },
  };

  const selectedPace = paceCopy[form.pace];
  const title = topic;
  const lessonTitles = selectedPace.modules.map((label, index) => {
    if (index === 0) return `${label}: ${topic}`;
    if (index === 1) return `${label}: ${topic.split(' ').slice(0, 3).join(' ') || topic}`;
    return `${label}: next-step review`;
  });

  return {
    title,
    summary: `A ${selectedPace.label} course for ${audience} that helps them ${outcome}.`,
    lessonTitles,
    coachNote: selectedPace.note,
  };
}

export function courseToFormState(course?: CourseRow | null): CourseFormState {
  if (!course) return emptyCourseForm;

  return {
    title: course.title,
    description: course.description ?? '',
    thumbnailUrl: course.thumbnail_url ?? '',
    difficultyLevel: course.difficulty_level,
    estimatedHours: course.estimated_minutes > 0 ? String(course.estimated_minutes / 60) : '',
    priceTier: course.price_tier,
    price: course.price_tier === 'premium' && course.price > 0 ? String(course.price) : '',
  };
}

export function parseCourseForm(form: CourseFormState): { error?: string; payload?: CourseFormPayload } {
  const title = form.title.trim();
  if (!title) {
    return { error: 'Please enter a course title.' };
  }

  let estimatedMinutes: number | null | undefined = null;
  const estimatedHours = form.estimatedHours.trim();
  if (estimatedHours) {
    const parsedHours = Number(estimatedHours);
    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      return { error: 'Please enter a valid estimated duration.' };
    }
    estimatedMinutes = Math.round(parsedHours * 60);
  }

  let price = 0;
  if (form.priceTier === 'premium') {
    const parsedPrice = Number(form.price.trim());
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return { error: 'Please enter a valid price.' };
    }
    price = parsedPrice;
  }

  return {
    payload: {
      title,
      description: form.description.trim() || undefined,
      thumbnailUrl: form.thumbnailUrl.trim() || undefined,
      difficultyLevel: form.difficultyLevel,
      estimatedMinutes,
      priceTier: form.priceTier,
      price,
    },
  };
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === 'object') {
    const maybe = error as {
      message?: unknown;
      details?: unknown;
      code?: unknown;
    };
    const message = typeof maybe.message === 'string' ? maybe.message.trim() : '';
    const details = typeof maybe.details === 'string' ? maybe.details.trim() : '';

    if (message.includes('invalid input syntax for type uuid')) {
      return 'Internal ID format mismatch while saving. Please refresh and try again.';
    }

    if (message.includes('courses_author_id_fkey')) {
      return 'Your profile is not initialized yet. Please sign out, sign in again, and retry.';
    }

    if (message) {
      return details ? `${message} (${details})` : message;
    }
  }

  return 'Something went wrong. Please try again.';
}

export function formatUpdatedAt(updatedAt: string) {
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `Updated ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `Updated ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return 'Updated just now';
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return 'Self-paced';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

export function formatLessonDuration(seconds: number) {
  if (seconds <= 0) return 'Draft lesson';
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function formatStatus(status: CourseRow['status']) {
  switch (status) {
    case 'published':
      return 'Published';
    case 'archived':
      return 'Archived';
    default:
      return 'Draft';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeKind(value: unknown) {
  if (!isRecord(value)) return '';

  return [
    value.type,
    value.kind,
    value.block_type,
    value.component,
    value.name,
  ]
    .filter((entry): entry is string => typeof entry === 'string')
    .join(' ')
    .toLowerCase();
}

function collectBlocksFromValue(value: unknown): unknown[] {
  if (!isRecord(value)) return [];

  const blocks: unknown[] = [];
  const directBlocks = value.blocks;
  if (Array.isArray(directBlocks)) {
    blocks.push(...directBlocks);
  }

  const pages = value.pages;
  if (Array.isArray(pages)) {
    for (const page of pages) {
      if (!isRecord(page) || !Array.isArray(page.blocks)) continue;
      blocks.push(...page.blocks);
    }
  }

  return blocks;
}

export function summarizeLessonContent(lesson: CourseLessonRow) {
  const blocks = collectBlocksFromValue(lesson.content_json);
  const kindText = blocks.map(normalizeKind).join(' ');

  return {
    blockCount: blocks.length,
    hasAssessment: /\b(quiz|question|assessment|checkpoint|choice|blank|match|poll)\b/.test(kindText),
    hasExercise: /\b(exercise|practice|challenge|activity|task|lab|drill)\b/.test(kindText),
    hasAiTutor: /\b(ai|tutor|assistant|coach|prompt)\b/.test(kindText),
  };
}

export function getLatestLesson(course: CourseRow) {
  return [...course.lessons].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  )[0] ?? null;
}

export function getCourseInitials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'PR';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
}

export function formatDifficulty(value: CourseRow['difficulty_level']) {
  switch (value) {
    case 'advanced':
      return 'Advanced';
    case 'intermediate':
      return 'Intermediate';
    default:
      return 'Beginner';
  }
}

export function getCourseDisplayTags(course: CourseRow) {
  const existingTags = course.tags.map((tag) => tag.trim()).filter(Boolean);
  if (existingTags.length > 0) return existingTags.slice(0, 4);

  const haystack = `${course.title} ${course.description ?? ''}`.toLowerCase();
  const inferred = [
    ['Python', /\bpython\b/],
    ['AI', /\b(ai|artificial intelligence|prompt|model)\b/],
    ['Cybersecurity', /\b(cyber|security|network|privacy)\b/],
    ['UI/UX', /\b(ui|ux|design|interface|product)\b/],
    ['Data', /\b(data|analytics|sql|statistics)\b/],
    ['Web', /\b(web|html|css|javascript|react)\b/],
  ]
    .filter(([, pattern]) => (pattern as RegExp).test(haystack))
    .map(([label]) => label as string);

  return (inferred.length > 0 ? inferred : ['Course design']).slice(0, 4);
}

export function getCourseReadiness(course: CourseRow) {
  const lessonSummaries = course.lessons.map(summarizeLessonContent);
  const blockCount = lessonSummaries.reduce((total, lesson) => total + lesson.blockCount, 0);
  const hasAssessment = lessonSummaries.some((lesson) => lesson.hasAssessment);
  const hasExercise = lessonSummaries.some((lesson) => lesson.hasExercise);
  const hasAiTutor = lessonSummaries.some((lesson) => lesson.hasAiTutor);
  const description = course.description?.trim() ?? '';
  const hasLearningOutcomes = /\b(outcome|learn|master|understand|build|practice|able to)\b/i.test(description);
  const criteria = [
    {
      pass: Boolean(course.thumbnail_url),
      issue: 'Cover image / thumbnail missing',
      complete: 'Cover image ready',
    },
    {
      pass: description.length >= 24,
      issue: 'No description',
      complete: 'Description added',
    },
    {
      pass: hasLearningOutcomes,
      issue: 'No learning outcomes',
      complete: 'Learning outcomes visible',
    },
    {
      pass: course.lessons.length > 0,
      issue: 'No lesson structure',
      complete: 'Lesson structure started',
    },
    {
      pass: blockCount > 0,
      issue: 'No interactive content blocks',
      complete: `${blockCount} content block${blockCount === 1 ? '' : 's'}`,
    },
    {
      pass: hasAssessment,
      issue: 'No assessment',
      complete: 'Assessment included',
    },
    {
      pass: hasAiTutor,
      issue: 'No AI tutor enabled',
      complete: 'AI tutor enabled',
    },
    {
      pass: hasExercise,
      issue: 'No exercises',
      complete: 'Exercise flow included',
    },
  ];
  const resolved = criteria.filter((item) => item.pass).map((item) => item.complete);
  const issues = criteria.filter((item) => !item.pass).map((item) => item.issue);
  const score = Math.round((resolved.length / criteria.length) * 100);

  return {
    score,
    issues,
    resolved,
    blockCount,
    hasAssessment,
    hasExercise,
    hasAiTutor,
    nextAction: issues[0] ?? 'Ready for final review',
  };
}

export function getCourseWorkflowStatus(course: CourseRow, readinessScore: number): CourseWorkflowStatus {
  const tagText = course.tags.join(' ').toLowerCase();
  const publishedAt = course.published_at ? new Date(course.published_at).getTime() : null;

  if (course.status === 'archived') return 'archived';
  if (tagText.includes('collaborative') || tagText.includes('co-author')) return 'collaborative';
  if (tagText.includes('private')) return 'private';
  if (publishedAt && publishedAt > Date.now()) return 'scheduled';
  if (course.status === 'published') return 'published';
  if (readinessScore >= 80) return 'inReview';
  return 'draft';
}

export function formatWorkflowStatus(status: CourseWorkflowStatus) {
  switch (status) {
    case 'inReview':
      return 'In Review';
    case 'scheduled':
      return 'Scheduled';
    case 'published':
      return 'Published';
    case 'archived':
      return 'Archived';
    case 'private':
      return 'Private';
    case 'collaborative':
      return 'Collaborative';
    default:
      return 'Draft';
  }
}

export function buildMonthLabels(count: number, language: 'zh-CN' | 'en') {
  const labels: string[] = [];
  const now = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    labels.push(
      formatViewerDate(monthDate, language, {
        month: 'numeric',
        year: '2-digit',
      }),
    );
  }

  return labels;
}

export function buildRecentDayLabels(count: number, language: 'zh-CN' | 'en') {
  const labels: string[] = [];
  const now = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    labels.push(formatViewerWeekday(day, language));
  }

  return labels;
}

export function formatShortDateLabel(value: string, language: 'zh-CN' | 'en') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return formatViewerWeekday(date, language);
}

export function formatMonthLabel(value: string, language: 'zh-CN' | 'en') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return formatViewerDate(date, language, { month: 'numeric', year: '2-digit' });
}

export function formatSignedDelta(value: number) {
  if (value === 0) {
    return '0.0%';
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function buildLinePoints(values: number[], width: number, height: number, padding: number) {
  const safeValues = values.length > 0 ? values : [0];
  const maxValue = Math.max(...safeValues, 1);
  const step = safeValues.length > 1 ? (width - padding * 2) / (safeValues.length - 1) : 0;

  return safeValues.map((value, index) => {
    const x = padding + step * index;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    return { x, y, value };
  });
}
