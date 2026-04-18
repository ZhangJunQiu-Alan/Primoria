import { useEffect, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Compass,
  Lock,
  Play,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBootSplashGate } from '@/shared/boot/bootSplash';
import { enrollInCourse, fetchCourseDetail } from '@/shared/api/viewer/catalogApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { trackViewerAnalyticsEventOnce } from '@/shared/api/viewer/analyticsEvents';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';
import './coursePage.css';

type LessonPathState = 'completed' | 'current' | 'upcoming' | 'locked';

const lessonIcons = [Compass, Sparkles, Target, BookOpen, Zap];

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim();
  const expanded =
    normalized.length === 3 ? normalized.split('').map((char) => `${char}${char}`).join('') : normalized;

  if (!/^[\da-fA-F]{6}$/.test(expanded)) {
    return `rgba(122, 158, 126, ${alpha})`;
  }

  const value = Number.parseInt(expanded, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatDifficultyLabel(level: string, language: string) {
  if (language !== 'zh-CN') {
    return level;
  }

  if (level === 'beginner') {
    return '入门';
  }

  if (level === 'intermediate') {
    return '进阶';
  }

  if (level === 'advanced') {
    return '挑战';
  }

  return level;
}

function formatMinutes(minutes: number, template: string, fallback: string) {
  if (minutes <= 0) {
    return fallback;
  }

  return template.replace('{count}', String(minutes));
}

function formatLessonDuration(seconds: number, template: string, fallback: string) {
  if (seconds <= 0) {
    return fallback;
  }

  return template.replace('{count}', String(Math.max(1, Math.round(seconds / 60))));
}

export function CoursePage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const language = useProductLanguage();
  const copy = useViewerCopy();
  const courseId = params.courseId ?? '';

  const detailQuery = useQuery({
    queryKey: ['viewer', 'course', courseId, user?.id],
    queryFn: () => fetchCourseDetail(courseId, user?.id),
    enabled: Boolean(courseId),
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(courseId, user?.id ?? 'demo-user'),
    onSuccess: async (enrollment) => {
      captureViewerEvent('viewer_course_enrolled', { courseId });
      queryClient.setQueryData(['viewer', 'course', courseId, user?.id], (current: {
        course?: unknown;
        lessons?: unknown[];
        completed_lesson_ids?: string[];
        enrollment?: Record<string, unknown> | null;
      } | undefined) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          enrollment: current.enrollment ?? enrollment,
        };
      });
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'course', courseId, user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'enrollments', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'home', user?.id] });
    },
    onError: (error) => {
      captureViewerError(error, { area: 'course_enroll', courseId });
    },
  });

  const detail = detailQuery.data;
  const course = detail?.course;
  const isEnrolled = Boolean(detail?.enrollment);
  const lessons = detail?.lessons ?? [];
  const completedLessonIds = new Set(detail?.completed_lesson_ids ?? []);
  const completedCount = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
  const firstIncompleteIndex = lessons.findIndex((lesson) => !completedLessonIds.has(lesson.id));
  const nextLessonIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : lessons.length > 0 ? lessons.length - 1 : -1;
  const nextLesson = nextLessonIndex >= 0 ? lessons[nextLessonIndex] : null;
  const totalXp = lessons.reduce((sum, lesson) => sum + lesson.xp_reward, 0);
  const totalMinutes =
    course?.estimated_minutes && course.estimated_minutes > 0
      ? course.estimated_minutes
      : lessons.reduce((sum, lesson) => sum + Math.max(1, Math.round(lesson.duration_seconds / 60)), 0);
  const progressBp =
    detail?.enrollment &&
    'progress_bp' in detail.enrollment &&
    typeof detail.enrollment.progress_bp === 'number'
      ? detail.enrollment.progress_bp
      : lessons.length > 0
        ? Math.round((completedCount / lessons.length) * 10000)
        : 0;
  const progressPercent = Math.max(0, Math.min(100, Math.round(progressBp / 100)));
  const accentHex = course?.subjects.color_hex?.trim() || '#7a9e7e';
  const courseTheme = {
    '--course-accent': accentHex,
    '--course-accent-soft': hexToRgba(accentHex, 0.16),
    '--course-accent-glow': hexToRgba(accentHex, 0.28),
    '--course-accent-track': hexToRgba(accentHex, 0.1),
  } as CSSProperties;
  const progressRingStyle = {
    background: `conic-gradient(var(--course-accent) ${progressPercent}%, var(--course-accent-track) ${progressPercent}% 100%)`,
  } as CSSProperties;

  useBootSplashGate(Boolean(detailQuery.data || detailQuery.error));

  useEffect(() => {
    if (!course?.id) {
      return;
    }

    trackViewerAnalyticsEventOnce(`${location.key}:course:${course.id}`, 'course_view', {
      courseId: course.id,
    });
  }, [course?.id, location.key]);

  if (detailQuery.isLoading) {
    return (
      <PageContainer title={copy.course.pageTitle} subtitle={copy.course.loading}>
        <LoadingStateCard />
      </PageContainer>
    );
  }

  if (detailQuery.error) {
    return (
      <PageContainer title={copy.course.pageTitle} subtitle={copy.course.unavailable}>
        <ErrorStateCard
          message={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
          onRetry={() => void detailQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (!course) {
    return (
      <PageContainer title={copy.course.pageTitle} subtitle={copy.course.loading}>
        <SurfaceCard>
          <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">{copy.common.loading}</p>
        </SurfaceCard>
      </PageContainer>
    );
  }

  const courseCopy =
    language === 'zh-CN'
      ? {
          heroEyebrow: 'Guided route',
          heroPreview: '路径预览',
          overviewEyebrow: '路径总览',
          overviewTitle: '先看路线，再进入下一节',
          overviewBody: '把进度、节奏和下一站收进同一个界面里，让课程更像一段连续的学习旅程。',
          nextStop: '下一站',
          nextStopFallback: '报名后会从第一节开始进入路径。',
          progressLabel: '当前进度',
          lessonsStat: '课时数',
          xpStat: '总 XP',
          rhythmStat: '路线长度',
          current: '当前节点',
          completed: '已完成',
          upcoming: '路径中',
          locked: '未解锁',
          currentHint: '建议从这里开始，继续沿路径往下走。',
          completedHint: '这一节已经学过，可以随时回看巩固。',
          upcomingHint: '它已经进入路径队列，继续推进就会来到这里。',
          lockedHint: '先报名课程，路径节点会逐步点亮。',
          pathMode: '路径视图',
          pathDescription: '下一节会被重点高亮，已完成节点可回看，整门课更像一条清晰的学习路线。',
          nextAction: '继续路径',
          reviewAction: '回看路径',
          routeComplete: '整条路径已经完成，现在可以回看任意课时。',
          emptyPath: '课程路径正在整理中。',
        }
      : {
          heroEyebrow: 'Guided route',
          heroPreview: 'Path preview',
          overviewEyebrow: 'Path overview',
          overviewTitle: 'See the route before entering it',
          overviewBody: 'Progress, pacing, and your next stop sit together so the course feels like a guided journey.',
          nextStop: 'Next stop',
          nextStopFallback: 'The route starts at lesson one after you enroll.',
          progressLabel: 'Current progress',
          lessonsStat: 'Lessons',
          xpStat: 'Total XP',
          rhythmStat: 'Path length',
          current: 'Current',
          completed: 'Completed',
          upcoming: 'Queued',
          locked: 'Locked',
          currentHint: 'This is the best lesson to start right now.',
          completedHint: 'Already finished. Reopen it any time for review.',
          upcomingHint: 'Visible in the route and ready once you keep moving.',
          lockedHint: 'Enroll first to light up the route.',
          pathMode: 'Path view',
          pathDescription: 'The next lesson is emphasized, completed nodes stay reviewable, and the course keeps a strong sense of progression.',
          nextAction: 'Continue path',
          reviewAction: 'Review route',
          routeComplete: 'The full route is complete. Revisit any lesson whenever you want.',
          emptyPath: 'The lesson route is still being prepared.',
        };

  const primaryLessonTarget = isEnrolled ? nextLesson ?? lessons[0] ?? null : lessons[0] ?? null;
  const heroButtonLabel =
    isEnrolled && firstIncompleteIndex === -1 ? courseCopy.reviewAction : isEnrolled ? courseCopy.nextAction : copy.course.enroll;
  const heroNextStopTitle =
    primaryLessonTarget?.title ?? (language === 'zh-CN' ? '课时准备中' : 'Lessons coming soon');
  const heroNextStopBody =
    isEnrolled
      ? firstIncompleteIndex === -1
        ? courseCopy.routeComplete
        : courseCopy.currentHint
      : courseCopy.nextStopFallback;
  const thumbnailStyle = course.thumbnail_url
    ? ({
        backgroundImage: `linear-gradient(180deg, rgba(61,52,42,0.18), rgba(61,52,42,0.08)), url(${course.thumbnail_url})`,
      } satisfies CSSProperties)
    : undefined;
  const previewLessons =
    lessons.length > 0 ? lessons.slice(0, Math.min(4, lessons.length)) : Array.from({ length: 4 }, () => null);

  return (
    <PageContainer
      title={course.title}
      subtitle={course.description}
      headerHidden
      className="max-w-[1280px] pb-8"
    >
      <section className="course-page-shell space-y-4" style={courseTheme}>
        <SurfaceCard className="course-page-hero overflow-hidden p-0">
          <div className="course-page-hero__grid">
            <div className="course-page-hero__copy">
              <div className="flex flex-wrap gap-2">
                <span className="viewer-botanical-pill">{course.subjects.name}</span>
                <span className="viewer-botanical-pill">
                  {formatDifficultyLabel(course.difficulty_level, language)}
                </span>
                <span className="viewer-botanical-pill">
                  {formatMinutes(totalMinutes, copy.course.minutes, copy.course.openDuration)}
                </span>
                {isEnrolled ? (
                  <span className="viewer-botanical-pill border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]">
                    {copy.course.enrolled}
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                <p className="viewer-botanical-eyebrow">{courseCopy.heroEyebrow}</p>
                <h1 className="viewer-botanical-heading text-[2.9rem] leading-[0.95] md:text-[4rem]">
                  {course.title}
                </h1>
                <p className="course-page-hero__description">{course.description}</p>
              </div>

              <div className="course-page-hero__actions">
                {primaryLessonTarget ? (
                  <button
                    type="button"
                    className="viewer-botanical-button viewer-botanical-button--primary"
                    onClick={() => {
                      if (isEnrolled) {
                        navigate(`/lesson/${primaryLessonTarget.id}`);
                        return;
                      }
                      enrollMutation.mutate();
                    }}
                    disabled={enrollMutation.isPending}
                  >
                    {enrollMutation.isPending ? copy.course.enrolling : heroButtonLabel}
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="viewer-botanical-button viewer-botanical-button--primary"
                    onClick={() => enrollMutation.mutate()}
                    disabled={enrollMutation.isPending}
                  >
                    {enrollMutation.isPending ? copy.course.enrolling : copy.course.enroll}
                  </button>
                )}
                <Link to="/library" className="viewer-botanical-button viewer-botanical-button--secondary">
                  {copy.course.backToLibrary}
                </Link>
              </div>

              {enrollMutation.error instanceof Error ? (
                <span className="text-xs font-semibold text-rose-600">{enrollMutation.error.message}</span>
              ) : null}

              {course.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {course.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="course-page-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="course-page-hero__visual" style={thumbnailStyle}>
              <div className="course-page-hero__visual-wash" aria-hidden="true" />

              <div className="course-page-hero__preview" aria-hidden="true">
                <span className="course-page-hero__preview-label">{courseCopy.heroPreview}</span>
                <div className="course-page-hero__preview-track">
                  {previewLessons.map((lesson, index) => {
                    const previewState: LessonPathState =
                      lesson && completedLessonIds.has(lesson.id)
                        ? 'completed'
                        : lesson && index === nextLessonIndex && isEnrolled
                          ? 'current'
                          : isEnrolled
                            ? 'upcoming'
                            : 'locked';

                    return (
                      <span
                        key={lesson?.id ?? `preview-${index}`}
                        className={cn(
                          'course-page-hero__preview-node',
                          `course-page-hero__preview-node--${previewState}`,
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="course-page-hero__focus-card">
                <div className="course-page-progress-ring" style={progressRingStyle}>
                  <div className="course-page-progress-ring__inner">
                    <span>{progressPercent}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="viewer-botanical-eyebrow text-[0.66rem]">{courseCopy.nextStop}</p>
                  <h2 className="course-page-hero__focus-title">{heroNextStopTitle}</h2>
                  <p className="course-page-hero__focus-copy">{heroNextStopBody}</p>
                  <div className="course-page-hero__focus-meta">
                    <span>{formatLessonDuration(primaryLessonTarget?.duration_seconds ?? 0, copy.course.minutes, copy.course.openDuration)}</span>
                    {primaryLessonTarget?.xp_reward ? <span>{primaryLessonTarget.xp_reward} XP</span> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <SurfaceCard className="course-page-overview h-fit p-0 xl:sticky xl:top-6">
            <div className="course-page-overview__inner">
              <div className="space-y-3">
                <p className="viewer-botanical-eyebrow">{courseCopy.overviewEyebrow}</p>
                <h2 className="viewer-botanical-heading text-[2.2rem] leading-none">
                  {courseCopy.overviewTitle}
                </h2>
                <p className="text-sm font-medium leading-7 text-[#706459]">{courseCopy.overviewBody}</p>
              </div>

              <div className="course-page-overview__stats">
                <div className="course-page-overview__stat">
                  <span className="viewer-botanical-eyebrow text-[0.65rem]">{copy.course.difficulty}</span>
                  <strong>{formatDifficultyLabel(course.difficulty_level, language)}</strong>
                </div>
                <div className="course-page-overview__stat">
                  <span className="viewer-botanical-eyebrow text-[0.65rem]">{courseCopy.lessonsStat}</span>
                  <strong>{lessons.length}</strong>
                </div>
                <div className="course-page-overview__stat">
                  <span className="viewer-botanical-eyebrow text-[0.65rem]">{courseCopy.xpStat}</span>
                  <strong>{totalXp}</strong>
                </div>
                <div className="course-page-overview__stat">
                  <span className="viewer-botanical-eyebrow text-[0.65rem]">{courseCopy.rhythmStat}</span>
                  <strong>{formatMinutes(totalMinutes, copy.course.minutes, copy.course.openDuration)}</strong>
                </div>
              </div>

              <div className="course-page-overview__next-stop">
                <div>
                  <p className="viewer-botanical-eyebrow text-[0.65rem]">{courseCopy.progressLabel}</p>
                  <h3 className="course-page-overview__next-title">
                    {completedCount}/{lessons.length || 0}
                  </h3>
                </div>
                <p className="course-page-overview__next-copy">
                  {isEnrolled
                    ? firstIncompleteIndex === -1
                      ? courseCopy.routeComplete
                      : `${courseCopy.nextStop} · ${nextLesson?.title ?? heroNextStopTitle}`
                    : courseCopy.nextStopFallback}
                </p>
              </div>

              <div className="course-page-note">
                <p className="viewer-botanical-eyebrow text-[0.68rem]">{copy.course.noteLabel}</p>
                <p className="mt-3 text-sm font-medium leading-7 text-[#71655b]">{copy.course.noteBody}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {isEnrolled ? (
                  <span className="viewer-botanical-pill border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]">
                    {copy.course.enrolled}
                  </span>
                ) : (
                  <span className="viewer-botanical-pill border-[#e2d5c2] bg-[#fbf7f0] text-[#8b7153]">
                    {copy.course.locked}
                  </span>
                )}
                <span className="viewer-botanical-pill">{course.subjects.name}</span>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="course-page-path-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <span className="course-page-path-panel__mode">{courseCopy.pathMode}</span>
                <h2 className="viewer-botanical-heading text-[2.2rem] leading-none">{copy.course.lessonList}</h2>
                <p className="max-w-2xl text-sm font-medium leading-7 text-[#706459]">
                  {courseCopy.pathDescription}
                </p>
              </div>
              {!isEnrolled ? <span className="viewer-botanical-pill text-[0.72rem]">{copy.course.locked}</span> : null}
            </div>

            {lessons.length > 0 ? (
              <div className="course-path" aria-label={copy.course.lessonList}>
                {lessons.map((lesson, index) => {
                  const lessonLabel = copy.course.lessonLabel.replace('{index}', String((lesson.sort_key as number) + 1));
                  const isCompleted = completedLessonIds.has(lesson.id);
                  const state: LessonPathState = !isEnrolled || lesson.is_locked
                    ? 'locked'
                    : isCompleted
                      ? 'completed'
                      : index === nextLessonIndex
                        ? 'current'
                        : 'upcoming';
                  const stateLabel =
                    state === 'completed'
                      ? courseCopy.completed
                      : state === 'current'
                        ? courseCopy.current
                        : state === 'upcoming'
                          ? courseCopy.upcoming
                          : courseCopy.locked;
                  const stateHint =
                    state === 'completed'
                      ? courseCopy.completedHint
                      : state === 'current'
                        ? courseCopy.currentHint
                        : state === 'upcoming'
                          ? courseCopy.upcomingHint
                          : courseCopy.lockedHint;
                  const alignment = index % 2 === 0 ? 'right' : 'left';
                  const LessonIcon =
                    state === 'current' ? Play : state === 'locked' ? Lock : lessonIcons[index % lessonIcons.length];

                  return (
                    <article key={lesson.id} className={cn('course-path-stop', `course-path-stop--${alignment}`)}>
                      <div className="course-path-stop__node-wrap" aria-hidden="true">
                        <div className={cn('course-path-stop__node', `course-path-stop__node--${state}`)}>
                          <LessonIcon size={22} strokeWidth={2.2} />
                          {state === 'completed' ? (
                            <span className="course-path-stop__node-badge">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="course-path-stop__content">
                        <div className="course-path-stop__topline">
                          <p className="viewer-botanical-eyebrow text-[0.66rem]">{lessonLabel}</p>
                          <span className={cn('course-path-stop__state', `course-path-stop__state--${state}`)}>
                            {stateLabel}
                          </span>
                        </div>

                        <h3 className="course-path-stop__title">{lesson.title}</h3>
                        <p className="course-path-stop__note">{stateHint}</p>

                        <div className="course-path-stop__meta">
                          <span>
                            <Clock3 size={14} />
                            {formatLessonDuration(lesson.duration_seconds, copy.course.minutes, copy.course.openDuration)}
                          </span>
                          {lesson.xp_reward > 0 ? (
                            <span>
                              <Zap size={14} />
                              {lesson.xp_reward} XP
                            </span>
                          ) : null}
                        </div>

                        <div className="course-path-stop__actions">
                          {isEnrolled && !lesson.is_locked ? (
                            <button
                              type="button"
                              className={cn(
                                'viewer-botanical-button',
                                state === 'current'
                                  ? 'viewer-botanical-button--primary'
                                  : 'viewer-botanical-button--secondary',
                              )}
                              onClick={() => navigate(`/lesson/${lesson.id}`)}
                            >
                              {copy.course.startLesson}
                              <ArrowRight size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="viewer-botanical-button viewer-botanical-button--secondary"
                              disabled
                            >
                              {copy.course.enroll}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[28px] border border-[#dfd3c4] bg-[rgba(255,252,247,0.82)] px-5 py-8 text-sm font-medium text-[#7a6b5e]">
                {courseCopy.emptyPath}
              </div>
            )}
          </SurfaceCard>
        </div>
      </section>
    </PageContainer>
  );
}
