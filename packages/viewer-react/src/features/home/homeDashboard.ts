import type { ViewerCourse, ViewerEnrollment, ViewerStats } from '@/shared/api/viewer/types';
import { formatViewerDateTime } from '@/shared/i18n/format';
import type { ViewerLanguage } from '@/shared/i18n/locale';

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

function translateDifficulty(value: string, language: ViewerLanguage) {
  switch (value.trim().toLowerCase()) {
    case 'beginner':
      return language === 'zh-CN' ? '入门' : 'Beginner';
    case 'intermediate':
      return language === 'zh-CN' ? '进阶' : 'Intermediate';
    case 'advanced':
      return language === 'zh-CN' ? '挑战' : 'Advanced';
    default:
      return value || (language === 'zh-CN' ? '课程' : 'Course');
  }
}

function formatMinutesLabel(minutes: number, language: ViewerLanguage) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return language === 'zh-CN' ? '灵活安排' : 'Flexible pacing';
  }

  return language === 'zh-CN' ? `${Math.round(minutes)} 分钟` : `${Math.round(minutes)} min`;
}

function formatLessonDuration(durationSeconds: number, language: ViewerLanguage) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return language === 'zh-CN' ? `${minutes} 分钟` : `${minutes} min`;
}

function formatLastAccessed(value: string | null | undefined, language: ViewerLanguage) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatViewerDateTime(parsed, language);
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
  language: ViewerLanguage,
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
    difficultyLabel: translateDifficulty(enrollment.courses.difficulty_level, language),
    estimatedLabel: formatMinutesLabel(enrollment.courses.estimated_minutes, language),
    lastAccessedLabel: formatLastAccessed(enrollment.last_accessed_at ?? enrollment.started_at, language),
    nextLessonTitle: nextLesson?.title ?? null,
    nextLessonDurationLabel: nextLesson ? formatLessonDuration(nextLesson.duration_seconds, language) : null,
    completedLessons,
    totalLessons: detail?.lessons.length ?? 0,
  };
}

export function getHomeContinueTarget(
  enrollment: ViewerEnrollment | null,
  language: ViewerLanguage,
  detail?: HomeCourseDetail | null,
): HomeContinueTarget {
  if (!enrollment) {
    return {
      kind: 'library',
      href: '/library',
      label: language === 'zh-CN' ? '浏览课程' : 'Browse library',
      supportingLabel:
        language === 'zh-CN'
          ? '先选一门课程，再开始今天的学习。'
          : 'Choose a course first, then start today’s study session.',
      lessonTitle: null,
    };
  }

  const completedSet = new Set(detail?.completed_lesson_ids ?? []);
  const nextLesson = detail?.lessons.find((lesson) => !completedSet.has(lesson.id)) ?? null;

  if (nextLesson) {
    return {
      kind: 'lesson',
      href: `/lesson/${nextLesson.id}`,
      label: language === 'zh-CN' ? '继续下一课' : 'Continue next lesson',
      supportingLabel: nextLesson.title,
      lessonTitle: nextLesson.title,
    };
  }

  return {
    kind: 'course',
    href: `/course/${enrollment.course_id}`,
    label: language === 'zh-CN' ? '回顾课程' : 'Review course',
    supportingLabel:
      language === 'zh-CN'
        ? '课程路径已经完成，回到课程页复盘重点。'
        : 'The course path is already complete. Return to the course page to review the key points.',
    lessonTitle: null,
  };
}

export function buildHomeCoachState({
  stats,
  language,
  selectedCourse,
  continueTarget,
}: {
  stats?: ViewerStats | null;
  language: ViewerLanguage;
  selectedCourse: HomeSelectedCourse | null;
  continueTarget: HomeContinueTarget;
}): HomeCoachState {
  const streak = Math.max(0, Math.round(stats?.current_streak ?? 0));

  if (!selectedCourse) {
    return {
      accentLabel: language === 'zh-CN' ? '先起步' : 'Start small',
      title:
        language === 'zh-CN'
          ? '先挑一门你愿意继续的课。'
          : 'Pick one course you are willing to continue.',
      message:
        language === 'zh-CN'
          ? '我会把今天的目标收成更小、更容易开始的一步。先从课程库选一门在意的主题，再回来继续。'
          : 'I will shrink today’s goal into one easier step. Choose a course you care about first, then come back here to continue.',
      supportingNote:
        streak >= 3
          ? language === 'zh-CN'
            ? `你已经连续学习 ${streak} 天了，今天只要先开始，就能把节奏保住。`
            : `You are already on a ${streak}-day streak. Starting is enough to keep it going today.`
          : language === 'zh-CN'
            ? '今天先做出一个选择，比一次学很多更重要。'
            : 'Making one clear choice today matters more than trying to do too much at once.',
    };
  }

  const progress = selectedCourse.progressPct;

  if (progress < 25) {
    return {
      accentLabel: language === 'zh-CN' ? '先起步' : 'Start small',
      title:
        language === 'zh-CN'
          ? '先把第一段推进起来。'
          : 'Push the first segment forward.',
      message:
        language === 'zh-CN'
          ? `你已经选好了 ${selectedCourse.course.title}。先完成一节课，把今天的学习状态拉起来，再考虑扩展内容。`
          : `You already picked ${selectedCourse.course.title}. Finish one lesson first, get today’s study state moving, then expand if you want more.`,
      supportingNote:
        streak >= 3
          ? language === 'zh-CN'
            ? `已经连续 ${streak} 天保持节奏了，今天只要把第一段课完成，就不会断掉。`
            : `You have kept the rhythm for ${streak} straight days. Finishing the first segment is enough to avoid breaking it.`
          : language === 'zh-CN'
            ? '不用把目标放太大，先完成眼前这一节就够了。'
            : 'Keep the goal small. Finishing the next lesson is enough.',
    };
  }

  if (progress > 75) {
    return {
      accentLabel: language === 'zh-CN' ? '冲刺完成' : 'Finish strong',
      title:
        language === 'zh-CN'
          ? '这门课已经进入收尾阶段。'
          : 'This course is in its finishing stage.',
      message:
        language === 'zh-CN'
          ? `还差一点就能把 ${selectedCourse.course.title} 收住。先完成最后几段内容，再让我帮你整理一版复盘重点。`
          : `You are close to wrapping up ${selectedCourse.course.title}. Finish the last few segments, then I can help turn it into a compact review.`,
      supportingNote:
        streak >= 3
          ? language === 'zh-CN'
            ? `连续 ${streak} 天的节奏很稳，现在最适合把这门课完整关掉。`
            : `Your ${streak}-day rhythm is steady. This is the right moment to close the course cleanly.`
          : language === 'zh-CN'
            ? '今天更适合做收尾，而不是分散到新的主题上。'
            : 'Today is better spent finishing than scattering attention onto a new topic.',
    };
  }

  return {
    accentLabel: language === 'zh-CN' ? '保持节奏' : 'Keep the rhythm',
    title:
      language === 'zh-CN'
        ? '先把今天的主线继续下去。'
        : 'Keep today’s main track moving.',
    message:
      language === 'zh-CN'
        ? `你的进度已经铺开了，下一步就做 ${continueTarget.supportingLabel}。先推进主线，再进入 AI 导师整理重点。`
        : `Your progress is already in motion. The next step is ${continueTarget.supportingLabel}. Advance the main track first, then use AI Tutor to organize the key points.`,
    supportingNote:
      streak >= 3
        ? language === 'zh-CN'
          ? `连续 ${streak} 天的投入已经形成节奏，今天保持住就很有价值。`
          : `A ${streak}-day streak already forms a rhythm. Holding it today is valuable on its own.`
        : language === 'zh-CN'
          ? '先推进主线课程，今天就会更稳。'
          : 'Advancing the main course first will make today feel steadier.',
  };
}
