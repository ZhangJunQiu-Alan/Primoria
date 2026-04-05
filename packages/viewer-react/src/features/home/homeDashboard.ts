import type { ViewerCourse, ViewerEnrollment, ViewerStats } from '@/shared/api/viewer/types';

export const HOME_CURRENT_COURSE_STORAGE_PREFIX = 'viewer.home.current-course:';

type HomeLesson = {
  id: string;
  title: string;
  sort_key: number;
  duration_seconds: number;
};

export type HomeCourseDetail = {
  course: ViewerCourse;
  lessons: HomeLesson[];
  completed_lesson_ids: string[];
};

export type HomeContinueTarget = {
  kind: 'lesson' | 'course' | 'library';
  href: string;
  label: string;
  supportingLabel: string;
  lessonTitle: string | null;
};

export type HomeSelectedCourse = {
  enrollment: ViewerEnrollment;
  course: ViewerCourse;
  progressPct: number;
  difficultyLabel: string;
  estimatedLabel: string;
  lastAccessedLabel: string | null;
  nextLessonTitle: string | null;
  nextLessonDurationLabel: string | null;
  completedLessons: number;
  totalLessons: number;
};

export type HomeCoachState = {
  accentLabel: string;
  title: string;
  message: string;
  supportingNote: string;
};

function clampProgress(progressBp: number) {
  return Math.max(0, Math.min(100, Math.round(progressBp / 100)));
}

function parseTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function translateDifficulty(value: string) {
  switch (value.trim().toLowerCase()) {
    case 'beginner':
      return '入门';
    case 'intermediate':
      return '进阶';
    case 'advanced':
      return '挑战';
    default:
      return value || '课程';
  }
}

function formatMinutesLabel(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '灵活安排';
  }

  return `${Math.round(minutes)} 分钟`;
}

function formatLessonDuration(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} 分钟`;
}

function formatLastAccessed(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function buildStorageKey(userId: string) {
  return `${HOME_CURRENT_COURSE_STORAGE_PREFIX}${userId}`;
}

export function sortHomeInProgressEnrollments(enrollments: ViewerEnrollment[]) {
  return enrollments
    .filter((entry) => entry.status === 'in_progress')
    .slice()
    .sort((left, right) => {
      const accessDelta = parseTimestamp(right.last_accessed_at) - parseTimestamp(left.last_accessed_at);
      if (accessDelta !== 0) {
        return accessDelta;
      }

      const startedDelta = parseTimestamp(right.started_at) - parseTimestamp(left.started_at);
      if (startedDelta !== 0) {
        return startedDelta;
      }

      return (right.progress_bp ?? 0) - (left.progress_bp ?? 0);
    });
}

export function readPersistedHomeCourseId(userId?: string | null) {
  if (!userId || typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(buildStorageKey(userId));
  return typeof raw === 'string' && raw.trim() ? raw : null;
}

export function writePersistedHomeCourseId(userId: string, courseId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(buildStorageKey(userId), courseId);
}

export function clearPersistedHomeCourseId(userId?: string | null) {
  if (!userId || typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(buildStorageKey(userId));
}

export function getHomeSelectedCourse(
  enrollment: ViewerEnrollment | null,
  detail?: HomeCourseDetail | null,
): HomeSelectedCourse | null {
  if (!enrollment) {
    return null;
  }

  const completedSet = new Set(detail?.completed_lesson_ids ?? []);
  const nextLesson = detail?.lessons.find((lesson) => !completedSet.has(lesson.id)) ?? null;
  const completedLessons = detail?.lessons.filter((lesson) => completedSet.has(lesson.id)).length ?? 0;

  return {
    enrollment,
    course: enrollment.courses,
    progressPct: clampProgress(enrollment.progress_bp ?? 0),
    difficultyLabel: translateDifficulty(enrollment.courses.difficulty_level),
    estimatedLabel: formatMinutesLabel(enrollment.courses.estimated_minutes),
    lastAccessedLabel: formatLastAccessed(enrollment.last_accessed_at ?? enrollment.started_at),
    nextLessonTitle: nextLesson?.title ?? null,
    nextLessonDurationLabel: nextLesson ? formatLessonDuration(nextLesson.duration_seconds) : null,
    completedLessons,
    totalLessons: detail?.lessons.length ?? 0,
  };
}

export function getHomeContinueTarget(
  enrollment: ViewerEnrollment | null,
  detail?: HomeCourseDetail | null,
): HomeContinueTarget {
  if (!enrollment) {
    return {
      kind: 'library',
      href: '/library',
      label: '浏览课程',
      supportingLabel: '先选一门课程，再开始今天的学习。',
      lessonTitle: null,
    };
  }

  const completedSet = new Set(detail?.completed_lesson_ids ?? []);
  const nextLesson = detail?.lessons.find((lesson) => !completedSet.has(lesson.id)) ?? null;

  if (nextLesson) {
    return {
      kind: 'lesson',
      href: `/lesson/${nextLesson.id}`,
      label: '继续下一课',
      supportingLabel: nextLesson.title,
      lessonTitle: nextLesson.title,
    };
  }

  return {
    kind: 'course',
    href: `/course/${enrollment.course_id}`,
    label: '回顾课程',
    supportingLabel: '课程路径已经完成，回到课程页复盘重点。',
    lessonTitle: null,
  };
}

export function buildHomeCoachState({
  stats,
  selectedCourse,
  continueTarget,
}: {
  stats?: ViewerStats | null;
  selectedCourse: HomeSelectedCourse | null;
  continueTarget: HomeContinueTarget;
}): HomeCoachState {
  const streak = Math.max(0, Math.round(stats?.current_streak ?? 0));

  if (!selectedCourse) {
    return {
      accentLabel: '先起步',
      title: '先挑一门你愿意继续的课。',
      message:
        '我会把今天的目标收成更小、更容易开始的一步。先从课程库选一门在意的主题，再回来继续。',
      supportingNote:
        streak >= 3 ? `你已经连续学习 ${streak} 天了，今天只要先开始，就能把节奏保住。` : '今天先做出一个选择，比一次学很多更重要。',
    };
  }

  const progress = selectedCourse.progressPct;

  if (progress < 25) {
    return {
      accentLabel: '先起步',
      title: '先把第一段推进起来。',
      message: `你已经选好了 ${selectedCourse.course.title}。先完成一节课，把今天的学习状态拉起来，再考虑扩展内容。`,
      supportingNote:
        streak >= 3
          ? `已经连续 ${streak} 天保持节奏了，今天只要把第一段课完成，就不会断掉。`
          : '不用把目标放太大，先完成眼前这一节就够了。',
    };
  }

  if (progress > 75) {
    return {
      accentLabel: '冲刺完成',
      title: '这门课已经进入收尾阶段。',
      message: `还差一点就能把 ${selectedCourse.course.title} 收住。先完成最后几段内容，再让我帮你整理一版复盘重点。`,
      supportingNote:
        streak >= 3
          ? `连续 ${streak} 天的节奏很稳，现在最适合把这门课完整关掉。`
          : '今天更适合做收尾，而不是分散到新的主题上。',
    };
  }

  return {
    accentLabel: '保持节奏',
    title: '先把今天的主线继续下去。',
    message: `你的进度已经铺开了，下一步就做 ${continueTarget.supportingLabel}。先推进主线，再进入 AI 导师整理重点。`,
    supportingNote:
      streak >= 3
        ? `连续 ${streak} 天的投入已经形成节奏，今天保持住就很有价值。`
        : '先推进主线课程，今天就会更稳。',
  };
}
