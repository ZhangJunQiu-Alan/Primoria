import { formatViewerDate, formatViewerWeekday } from '@/shared/i18n/format';
import type { CourseRow } from '@/queries/courses';
import type {
  AICourseDraftFormState,
  AICourseDraftPace,
  AICourseDraftPreview,
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

export const aiCourseTopicPresets = [
  'Physics problem-solving sprint',
  'Prompt design for beginners',
  'Interactive web fundamentals',
];

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
