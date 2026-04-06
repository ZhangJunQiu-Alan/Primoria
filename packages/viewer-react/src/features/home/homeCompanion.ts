import type { AiTutorPersonaDefinition } from '@/shared/ai-tutor/persona';
import type { ViewerCourse, ViewerStats } from '@/shared/api/viewer/types';
import type { HomeSelectedCourse } from './homeDashboard';

const DAY_MS = 24 * 60 * 60 * 1000;

export type HomeCompanionAnchor = 'left' | 'right' | 'top' | 'bottom' | 'sheet';
export type HomeCompanionRecommendationPace = 'easier' | 'same' | 'harder';
export type HomeCompanionInsightKind = 'no_course' | 'review' | 'finish' | 'continue' | 'first_step' | 'default';

export type HomeCompanionInsight = {
  kind: HomeCompanionInsightKind;
  message: string;
  inactiveDays: number | null;
};

export type HomeCompanionPlacementInput = {
  containerWidth: number;
  containerHeight: number;
  anchorX: number;
  anchorY: number;
  anchorWidth: number;
  anchorHeight: number;
  popoverWidth: number;
  popoverHeight: number;
  viewportWidth: number;
  bottomInset?: number;
  gap?: number;
  padding?: number;
};

export type HomeCompanionPlacement = {
  anchor: HomeCompanionAnchor;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function daysSince(value: string | null | undefined, now: number) {
  const timestamp = parseTimestamp(value);
  if (timestamp == null) {
    return null;
  }

  return Math.max(0, Math.floor((now - timestamp) / DAY_MS));
}

function difficultyRank(level: string) {
  switch (level.trim().toLowerCase()) {
    case 'beginner':
      return 0;
    case 'intermediate':
      return 1;
    case 'advanced':
      return 2;
    default:
      return 1;
  }
}

function recommendationScore(
  course: ViewerCourse,
  currentCourse: ViewerCourse | null,
  subjectId: string | null,
  recommendFromId: string | null,
  pace: HomeCompanionRecommendationPace,
) {
  let score = 0;

  if (subjectId) {
    score += course.subject_id === subjectId ? 4000 : -4000;
  }

  if (recommendFromId && course.id === recommendFromId) {
    score -= 10_000;
  }

  const courseDifficulty = difficultyRank(course.difficulty_level);
  const currentDifficulty = currentCourse ? difficultyRank(currentCourse.difficulty_level) : null;
  const currentMinutes = currentCourse?.estimated_minutes ?? 0;
  const minuteDelta = course.estimated_minutes - currentMinutes;

  if (currentDifficulty == null) {
    if (pace === 'harder') {
      score += courseDifficulty * 320 + course.estimated_minutes * 0.4;
    } else if (pace === 'same') {
      score += (2 - Math.abs(courseDifficulty - 1)) * 260 - Math.abs(course.estimated_minutes - 45) * 0.4;
    } else {
      score += (2 - courseDifficulty) * 320 - course.estimated_minutes * 0.4;
    }
    return score;
  }

  const difficultyDelta = courseDifficulty - currentDifficulty;

  if (pace === 'harder') {
    score += difficultyDelta >= 0 ? 2200 - difficultyDelta * 240 : 480 - Math.abs(difficultyDelta) * 220;
    score += minuteDelta >= 0 ? 260 - Math.min(minuteDelta, 120) * 1.2 : -Math.abs(minuteDelta) * 0.9;
    return score;
  }

  if (pace === 'same') {
    score += 2200 - Math.abs(difficultyDelta) * 340;
    score += 260 - Math.min(Math.abs(minuteDelta), 160) * 1.1;
    return score;
  }

  score += difficultyDelta <= 0 ? 2200 - Math.abs(difficultyDelta) * 240 : 480 - difficultyDelta * 220;
  score += minuteDelta <= 0 ? 260 - Math.min(Math.abs(minuteDelta), 120) * 1.2 : -Math.min(minuteDelta, 160) * 0.9;
  return score;
}

export function getHomeCompanionInsight({
  persona,
  selectedCourse,
  stats,
  now = Date.now(),
}: {
  persona: AiTutorPersonaDefinition;
  selectedCourse: HomeSelectedCourse | null;
  stats?: ViewerStats | null;
  now?: number;
}): HomeCompanionInsight {
  if (!selectedCourse) {
    return {
      kind: 'no_course',
      message: persona.homeCompanionMessages.noCourse,
      inactiveDays: null,
    };
  }

  const courseInactiveDays = daysSince(
    selectedCourse.enrollment.last_accessed_at ?? selectedCourse.enrollment.started_at ?? null,
    now,
  );
  const activityInactiveDays = daysSince(stats?.last_activity_date ?? null, now);
  const inactiveDays = Math.max(courseInactiveDays ?? 0, activityInactiveDays ?? 0);

  if ((courseInactiveDays != null && courseInactiveDays >= 7) || (activityInactiveDays != null && activityInactiveDays >= 7)) {
    return {
      kind: 'review',
      message: persona.homeCompanionMessages.review(selectedCourse.course.title, inactiveDays || null),
      inactiveDays,
    };
  }

  if (selectedCourse.progressPct >= 80 && selectedCourse.nextLessonTitle) {
    return {
      kind: 'finish',
      message: persona.homeCompanionMessages.finish(selectedCourse.nextLessonTitle),
      inactiveDays,
    };
  }

  if (
    selectedCourse.progressPct >= 20 &&
    selectedCourse.progressPct < 80 &&
    courseInactiveDays != null &&
    courseInactiveDays <= 2
  ) {
    return {
      kind: 'continue',
      message: persona.homeCompanionMessages.continue(selectedCourse.nextLessonTitle),
      inactiveDays,
    };
  }

  if (selectedCourse.progressPct < 20) {
    return {
      kind: 'first_step',
      message: persona.homeCompanionMessages.firstStep(selectedCourse.nextLessonTitle),
      inactiveDays,
    };
  }

  return {
    kind: 'default',
    message: persona.homeCompanionMessages.default(selectedCourse.nextLessonTitle),
    inactiveDays,
  };
}

export function getHomeCompanionPlacement({
  containerWidth,
  containerHeight,
  anchorX,
  anchorY,
  anchorWidth,
  anchorHeight,
  popoverWidth,
  popoverHeight,
  viewportWidth,
  bottomInset = 20,
  gap = 18,
  padding = 16,
}: HomeCompanionPlacementInput): HomeCompanionPlacement {
  if (viewportWidth < 768) {
    return {
      anchor: 'sheet',
      x: padding,
      y: clamp(
        containerHeight - popoverHeight - bottomInset - padding,
        padding,
        Math.max(padding, containerHeight - popoverHeight - padding),
      ),
    };
  }

  const leftSpace = anchorX - gap - padding;
  const rightSpace = containerWidth - (anchorX + anchorWidth) - gap - padding;
  const topSpace = anchorY - gap - padding;
  const bottomSpace = containerHeight - bottomInset - (anchorY + anchorHeight) - gap - padding;
  const anchorCenterX = anchorX + anchorWidth / 2;
  const anchorCenterY = anchorY + anchorHeight / 2;
  const maxY = Math.max(padding, containerHeight - bottomInset - popoverHeight - padding);
  const maxX = Math.max(padding, containerWidth - popoverWidth - padding);

  let anchor: HomeCompanionAnchor = 'left';
  if (leftSpace >= popoverWidth) {
    anchor = 'left';
  } else if (rightSpace >= popoverWidth) {
    anchor = 'right';
  } else if (topSpace >= popoverHeight) {
    anchor = 'top';
  } else if (bottomSpace >= popoverHeight) {
    anchor = 'bottom';
  }

  if (anchor === 'left') {
    return {
      anchor,
      x: clamp(anchorX - popoverWidth - gap, padding, maxX),
      y: clamp(anchorCenterY - popoverHeight / 2, padding, maxY),
    };
  }

  if (anchor === 'right') {
    return {
      anchor,
      x: clamp(anchorX + anchorWidth + gap, padding, maxX),
      y: clamp(anchorCenterY - popoverHeight / 2, padding, maxY),
    };
  }

  if (anchor === 'top') {
    return {
      anchor,
      x: clamp(anchorCenterX - popoverWidth / 2, padding, maxX),
      y: clamp(anchorY - popoverHeight - gap, padding, maxY),
    };
  }

  return {
    anchor: 'bottom',
    x: clamp(anchorCenterX - popoverWidth / 2, padding, maxX),
    y: clamp(anchorY + anchorHeight + gap, padding, maxY),
  };
}

export function rankHomeCompanionRecommendations(
  courses: ViewerCourse[],
  {
    subjectId,
    recommendFromId,
    pace,
  }: {
    subjectId?: string | null;
    recommendFromId?: string | null;
    pace?: HomeCompanionRecommendationPace | null;
  },
) {
  if (!pace) {
    return courses;
  }

  const currentCourse = courses.find((course) => course.id === recommendFromId) ?? null;

  return courses
    .slice()
    .sort((left, right) => {
      const scoreDelta =
        recommendationScore(right, currentCourse, subjectId ?? null, recommendFromId ?? null, pace) -
        recommendationScore(left, currentCourse, subjectId ?? null, recommendFromId ?? null, pace);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const publishedDelta = Date.parse(right.published_at ?? '') - Date.parse(left.published_at ?? '');
      if (Number.isFinite(publishedDelta) && publishedDelta !== 0) {
        return publishedDelta;
      }

      return left.title.localeCompare(right.title);
    });
}

export function normalizeHomeCompanionRecommendationPace(
  value: string | null | undefined,
): HomeCompanionRecommendationPace | null {
  if (value === 'easier' || value === 'same' || value === 'harder') {
    return value;
  }
  return null;
}
