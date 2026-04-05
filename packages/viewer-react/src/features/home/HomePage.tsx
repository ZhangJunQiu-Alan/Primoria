import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpenText, Bot, BrainCircuit, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchCourseDetail, fetchEnrollments } from '@/shared/api/viewer/catalogApi';
import { fetchUserStats } from '@/shared/api/viewer/profileApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';
import { publicAssetPath } from '@/shared/utils/publicAsset';
import { Live2DHeroModel } from './Live2DHeroModel';
import {
  buildHomeCoachState,
  clearPersistedHomeCourseId,
  getHomeContinueTarget,
  getHomeSelectedCourse,
  readPersistedHomeCourseId,
  sortHomeInProgressEnrollments,
  writePersistedHomeCourseId,
} from './homeDashboard';

function clampCompanionPosition(
  nextX: number,
  nextY: number,
  boundsWidth: number,
  boundsHeight: number,
  companionWidth: number,
  companionHeight: number,
) {
  return {
    x: Math.min(Math.max(0, nextX), Math.max(0, boundsWidth - companionWidth)),
    y: Math.min(Math.max(0, nextY), Math.max(0, boundsHeight - companionHeight)),
  };
}

export function HomePage() {
  const user = useAppSelector((state) => state.auth.user);
  const language = useAppSelector((state) => state.viewerPreferences.language);
  const copy = useViewerCopy();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [cardMotionDirection, setCardMotionDirection] = useState<'forward' | 'backward' | null>(null);
  const [companionPosition, setCompanionPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCompanion, setIsDraggingCompanion] = useState(false);
  const [hasInitializedCompanion, setHasInitializedCompanion] = useState(false);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const companionRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const statsQuery = useQuery({
    queryKey: ['viewer', 'stats', user?.id],
    queryFn: () => fetchUserStats(user?.id),
    enabled: Boolean(user),
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['viewer', 'enrollments', user?.id],
    queryFn: () => fetchEnrollments(user?.id ?? 'demo-user'),
    enabled: Boolean(user),
  });

  const inProgressEnrollments = sortHomeInProgressEnrollments(enrollmentsQuery.data ?? []);

  useEffect(() => {
    if (!user?.id) {
      setSelectedCourseId(null);
      return;
    }

    if (!inProgressEnrollments.length) {
      clearPersistedHomeCourseId(user.id);
      if (selectedCourseId !== null) {
        setSelectedCourseId(null);
      }
      return;
    }

    const currentStillValid = Boolean(
      selectedCourseId && inProgressEnrollments.some((entry) => entry.course_id === selectedCourseId),
    );

    if (currentStillValid && selectedCourseId) {
      writePersistedHomeCourseId(user.id, selectedCourseId);
      return;
    }

    const persistedCourseId = readPersistedHomeCourseId(user.id);
    const fallbackCourseId =
      inProgressEnrollments.find((entry) => entry.course_id === persistedCourseId)?.course_id ??
      inProgressEnrollments[0]?.course_id ??
      null;

    if (fallbackCourseId !== selectedCourseId) {
      setSelectedCourseId(fallbackCourseId);
    }

    if (fallbackCourseId) {
      writePersistedHomeCourseId(user.id, fallbackCourseId);
    }
  }, [inProgressEnrollments, selectedCourseId, user?.id]);

  const selectedEnrollment =
    inProgressEnrollments.find((entry) => entry.course_id === selectedCourseId) ?? null;

  const detailQuery = useQuery({
    queryKey: ['viewer', 'course', selectedCourseId, user?.id],
    queryFn: () => fetchCourseDetail(selectedCourseId ?? '', user?.id),
    enabled: Boolean(selectedCourseId && user?.id),
  });

  const selectedCourse = getHomeSelectedCourse(selectedEnrollment, language, detailQuery.data ?? null);
  const continueTarget = getHomeContinueTarget(selectedEnrollment, language, detailQuery.data ?? null);
  const stats = statsQuery.data;
  const coachState = buildHomeCoachState({
    stats,
    language,
    selectedCourse,
    continueTarget,
  });
  const pageError = statsQuery.error ?? enrollmentsQuery.error;
  const isPathLoading = Boolean(selectedEnrollment && detailQuery.isLoading && !detailQuery.data);
  const selectedCourseIndex = selectedEnrollment
    ? inProgressEnrollments.findIndex((entry) => entry.course_id === selectedEnrollment.course_id)
    : -1;
  const previousEnrollment = selectedCourseIndex > 0 ? inProgressEnrollments[selectedCourseIndex - 1] : null;
  const nextEnrollment =
    selectedCourseIndex >= 0 && selectedCourseIndex < inProgressEnrollments.length - 1
      ? inProgressEnrollments[selectedCourseIndex + 1]
      : null;

  function selectCourse(courseId: string, direction?: 'forward' | 'backward') {
    if (courseId === selectedCourseId) {
      return;
    }

    const nextIndex = inProgressEnrollments.findIndex((entry) => entry.course_id === courseId);
    const resolvedDirection =
      direction ??
      (selectedCourseIndex >= 0 && nextIndex >= 0 && nextIndex < selectedCourseIndex ? 'backward' : 'forward');

    setCardMotionDirection(resolvedDirection);
    setSelectedCourseId(courseId);
    if (user?.id) {
      writePersistedHomeCourseId(user.id, courseId);
    }
  }

  const courseSwitcher = inProgressEnrollments.length ? (
    <div
      data-testid="home-course-switcher"
      className="snap-x snap-mandatory overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex min-w-max gap-2.5">
        {inProgressEnrollments.map((entry) => {
          const isActive = entry.course_id === selectedEnrollment?.course_id;
          return (
            <button
              key={entry.course_id}
              type="button"
              className={[
                'flex min-h-[4.5rem] min-w-[11.5rem] max-w-[13.5rem] shrink-0 snap-start items-center gap-3 rounded-[20px] border px-3.5 py-3 text-left transition',
                isActive
                  ? 'border-[#c8dbcb] bg-[linear-gradient(145deg,rgba(237,245,236,0.98)_0%,rgba(221,236,223,0.92)_100%)] text-[#5c7d60] shadow-[0_14px_26px_rgba(122,158,126,0.14)]'
                  : 'border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] text-[#76685c] hover:border-[#cdbfae] hover:bg-[rgba(255,252,247,0.98)]',
              ].join(' ')}
              onClick={() => {
                selectCourse(entry.course_id);
              }}
            >
              <span
                className={[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border',
                  isActive
                    ? 'border-[#b8d0bb] bg-[rgba(255,255,255,0.78)] text-[#5c7d60]'
                    : 'border-[#e2d5c2] bg-[rgba(255,255,255,0.78)] text-[#8a7765]',
                ].join(' ')}
              >
                <BookOpenText size={17} />
              </span>
              <span className="min-w-0 text-[0.88rem] font-semibold leading-5">{entry.courses.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  useEffect(() => {
    const page = pageRef.current;
    const companion = companionRef.current;
    if (!page || !companion) {
      return;
    }

    const positionCompanion = () => {
      const boundsWidth = page.clientWidth;
      const boundsHeight = page.clientHeight;
      const companionWidth = companion.offsetWidth;
      const companionHeight = companion.offsetHeight;

      if (!boundsWidth || !boundsHeight || !companionWidth || !companionHeight) {
        return;
      }

      setCompanionPosition((current) => {
        if (!hasInitializedCompanion) {
          const defaultX = Math.max(24, boundsWidth - companionWidth - 32);
          const defaultY = window.innerWidth >= 1280 ? 92 : 170;
          setHasInitializedCompanion(true);
          return clampCompanionPosition(
            defaultX,
            defaultY,
            boundsWidth,
            boundsHeight,
            companionWidth,
            companionHeight,
          );
        }

        return clampCompanionPosition(
          current.x,
          current.y,
          boundsWidth,
          boundsHeight,
          companionWidth,
          companionHeight,
        );
      });
    };

    positionCompanion();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => positionCompanion()) : null;

    resizeObserver?.observe(page);
    resizeObserver?.observe(companion);
    window.addEventListener('resize', positionCompanion);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', positionCompanion);
    };
  }, [hasInitializedCompanion]);

  useEffect(() => {
    return () => {
      dragStateRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!cardMotionDirection) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCardMotionDirection(null);
    }, 320);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cardMotionDirection, selectedCourse?.course.id]);

  const handleCompanionPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const page = pageRef.current;
    const companion = companionRef.current;
    if (!page || !companion) {
      return;
    }

    const pageRect = page.getBoundingClientRect();
    const companionRect = companion.getBoundingClientRect();

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - companionRect.left,
      offsetY: event.clientY - companionRect.top,
    };

    companion.setPointerCapture(event.pointerId);
    setIsDraggingCompanion(true);
    setCompanionPosition((current) =>
      clampCompanionPosition(
        current.x,
        current.y,
        pageRect.width,
        pageRect.height,
        companionRect.width,
        companionRect.height,
      ),
    );
  };

  const handleCompanionPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    const page = pageRef.current;
    const companion = companionRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !page || !companion) {
      return;
    }

    const pageRect = page.getBoundingClientRect();
    const companionRect = companion.getBoundingClientRect();
    const nextX = event.clientX - pageRect.left - dragState.offsetX;
    const nextY = event.clientY - pageRect.top - dragState.offsetY;

    setCompanionPosition(
      clampCompanionPosition(
        nextX,
        nextY,
        pageRect.width,
        pageRect.height,
        companionRect.width,
        companionRect.height,
      ),
    );
  };

  const handleCompanionPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    const companion = companionRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    if (companion?.hasPointerCapture(event.pointerId)) {
      companion.releasePointerCapture(event.pointerId);
    }
    setIsDraggingCompanion(false);
  };

  if (statsQuery.isLoading || enrollmentsQuery.isLoading) {
    return (
      <div className="px-5 py-6 md:px-9 md:py-8">
        <LoadingStateCard />
      </div>
    );
  }

  if (pageError) {
    const message = pageError instanceof Error ? pageError.message : undefined;
    return (
      <div className="px-5 py-6 md:px-9 md:py-8">
        <ErrorStateCard
          message={message}
          onRetry={() => {
            void statsQuery.refetch();
            void enrollmentsQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={pageRef}
      className="relative mx-auto flex min-h-[calc(100svh-86px)] w-full max-w-[1320px] flex-col px-5 pb-6 pt-6 md:px-8 md:pb-8 md:pt-8"
    >
      <div className="flex items-start justify-between gap-4">
        <Link to="/home" className="inline-flex items-center gap-3">
          <div className="flex h-[4.25rem] w-[4.25rem] items-center justify-center overflow-hidden rounded-[22px] border border-[#ddd3c3] bg-[rgba(254,250,245,0.95)] shadow-[0_12px_28px_rgba(90,70,50,0.10)] md:h-[4.5rem] md:w-[4.5rem]">
            <img src={publicAssetPath('primoria-logo.png')} alt="Primoria" className="h-full w-full object-cover" />
          </div>
          <span
            className="text-[1.95rem] font-semibold tracking-[0.02em] text-[#5c7d60] md:text-[2.1rem]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            Primoria
          </span>
        </Link>

        <div className="inline-flex items-center gap-2.5 rounded-full border border-[#e5c9a8] bg-[linear-gradient(135deg,rgba(247,233,210,0.94)_0%,rgba(239,216,184,0.9)_100%)] px-4 py-2.5 text-[#8d6438] shadow-[0_14px_26px_rgba(196,149,106,0.16)]">
          <Sparkles size={19} className="fill-current" />
          <span className="text-[1.05rem] font-bold">{stats?.total_xp ?? 0}</span>
        </div>
      </div>

      <section className="relative mt-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <div className="flex flex-col gap-4">
            <div className="max-w-[48rem]">
              <div className="relative pr-3 pb-3 sm:pr-5 sm:pb-5">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-x-2 bottom-0 top-2 rounded-[30px] border border-[rgba(223,214,199,0.78)] bg-[rgba(255,250,244,0.54)] shadow-[0_18px_34px_rgba(90,70,50,0.05)] sm:inset-x-3 sm:top-3 sm:translate-x-3 sm:translate-y-3" />
                  <div className="absolute inset-x-1 bottom-1 top-1 rounded-[30px] border border-[rgba(230,220,206,0.72)] bg-[rgba(255,253,249,0.62)] shadow-[0_12px_24px_rgba(90,70,50,0.04)] sm:inset-x-2 sm:top-2 sm:translate-x-1.5 sm:translate-y-1.5" />
                </div>

                {selectedCourse && previousEnrollment ? (
                  <button
                    type="button"
                    data-testid="home-edge-prev"
                    aria-label={copy.home.previousCourse}
                    className="absolute bottom-14 left-[-0.7rem] top-10 z-20 flex w-8 items-center justify-start rounded-full bg-[linear-gradient(90deg,rgba(249,243,234,0.96)_0%,rgba(249,243,234,0.08)_100%)] pl-1.5 text-[#8a7765] opacity-72 transition duration-200 hover:opacity-100 hover:translate-x-[-1px] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#adc9b0] sm:w-10 sm:pl-2"
                    onClick={() => {
                      selectCourse(previousEnrollment.course_id, 'backward');
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                ) : null}

                {selectedCourse && nextEnrollment ? (
                  <button
                    type="button"
                    data-testid="home-edge-next"
                    aria-label={copy.home.nextCourse}
                    className="absolute bottom-14 right-[-0.7rem] top-10 z-20 flex w-8 items-center justify-end rounded-full bg-[linear-gradient(270deg,rgba(249,243,234,0.96)_0%,rgba(249,243,234,0.08)_100%)] pr-1.5 text-[#8a7765] opacity-72 transition duration-200 hover:opacity-100 hover:translate-x-[1px] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#adc9b0] sm:w-10 sm:pr-2"
                    onClick={() => {
                      selectCourse(nextEnrollment.course_id, 'forward');
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                ) : null}

                <div
                  data-testid="home-current-course-card"
                  className="relative flex min-h-[30rem] flex-col rounded-[32px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.96)_0%,rgba(249,243,234,0.9)_100%)] p-5 shadow-[0_22px_44px_rgba(90,70,50,0.09)] md:p-6 lg:min-h-[34rem]"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.52),transparent_36%),radial-gradient(circle_at_84%_22%,rgba(168,197,172,0.12),transparent_24%),radial-gradient(circle_at_82%_82%,rgba(196,149,106,0.1),transparent_28%)]" />

                  {selectedCourse ? (
                    <div
                      key={selectedCourse.course.id}
                      className={[
                        'relative flex min-h-0 flex-1 flex-col gap-5',
                        cardMotionDirection === 'backward'
                          ? 'home-course-card-content home-course-card-content--backward'
                          : cardMotionDirection === 'forward'
                            ? 'home-course-card-content home-course-card-content--forward'
                            : '',
                      ].join(' ')}
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="viewer-botanical-pill border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]">
                          {selectedCourse.course.subjects.name}
                        </span>
                        <span className="viewer-botanical-pill">{selectedCourse.difficultyLabel}</span>
                        <span className="viewer-botanical-pill">{selectedCourse.estimatedLabel}</span>
                      </div>

                      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1.22fr)_minmax(280px,0.78fr)] lg:items-stretch">
                        <div className="flex h-full flex-col justify-between">
                          <div>
                            <h2
                              className="text-[1.95rem] font-semibold leading-[0.92] text-[#3d342a] md:text-[2.55rem]"
                              style={{ fontFamily: '"Cormorant Garamond", serif' }}
                            >
                              {selectedCourse.course.title}
                            </h2>
                            <p className="mt-3 max-w-[34rem] text-sm leading-7 text-[#72665b]">
                              {selectedCourse.course.description ||
                                (language === 'zh-CN'
                                  ? '继续沿着当前课程推进。首页会替你定位下一步，并把今日建议收成更容易开始的动作。'
                                  : 'Keep moving through the current course. Home will locate the next step and shrink today’s plan into something easier to start.')}
                            </p>
                          </div>

                          <div className="mt-6 rounded-[26px] border border-[#e4d8ca] bg-[rgba(255,255,255,0.58)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="viewer-botanical-eyebrow text-[0.68rem]">{language === 'zh-CN' ? '当前进度' : 'Current progress'}</p>
                                <p className="mt-2 text-[2.4rem] font-semibold leading-none text-[#3d342a]">
                                  {selectedCourse.progressPct}%
                                </p>
                              </div>
                              <div className="text-sm leading-6 text-[#72665b] sm:text-right">
                                <p>
                                  {selectedCourse.totalLessons
                                    ? language === 'zh-CN'
                                      ? `已完成 ${selectedCourse.completedLessons} / ${selectedCourse.totalLessons} 节`
                                      : `Completed ${selectedCourse.completedLessons} / ${selectedCourse.totalLessons} lessons`
                                    : language === 'zh-CN'
                                      ? '课程结构同步中'
                                      : 'Course structure is syncing'}
                                </p>
                                <p>
                                  {selectedCourse.lastAccessedLabel
                                    ? language === 'zh-CN'
                                      ? `上次进入 ${selectedCourse.lastAccessedLabel}`
                                      : `Last opened ${selectedCourse.lastAccessedLabel}`
                                    : language === 'zh-CN'
                                      ? '刚刚开始这门课'
                                      : 'Just started this course'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 h-2.5 rounded-full bg-[#ebe3d6]">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#c6d8c9_0%,#7a9e7e_100%)]"
                                style={{ width: `${selectedCourse.progressPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex h-full flex-col rounded-[28px] border border-[#d9ccb9] bg-[rgba(255,250,244,0.88)] p-5 shadow-[0_18px_30px_rgba(90,70,50,0.06)]">
                          <div>
                            <p className="viewer-botanical-eyebrow text-[0.68rem]">{language === 'zh-CN' ? '下一步' : 'Next step'}</p>
                            <h3
                              className="mt-3 text-[1.85rem] font-semibold leading-[0.94] text-[#3d342a]"
                              style={{ fontFamily: '"Cormorant Garamond", serif' }}
                            >
                              {selectedCourse.nextLessonTitle ?? (language === 'zh-CN' ? '同步课程路径' : 'Syncing course path')}
                            </h3>
                            <p className="mt-3 text-sm leading-7 text-[#72665b]">
                              {selectedCourse.nextLessonTitle
                                ? language === 'zh-CN'
                                  ? `建议先完成这一步，再进入 AI 导师整理重点。${selectedCourse.nextLessonDurationLabel ? `预计 ${selectedCourse.nextLessonDurationLabel}。` : ''}`
                                  : `Finish this step first, then use AI Tutor to organize the key points.${selectedCourse.nextLessonDurationLabel ? ` Estimated ${selectedCourse.nextLessonDurationLabel}.` : ''}`
                                : detailQuery.error
                                  ? language === 'zh-CN'
                                    ? '课程路径暂时没有同步成功，你仍然可以先打开课程页查看结构。'
                                    : 'The course path did not sync yet, but you can still open the course page to inspect the structure.'
                                  : language === 'zh-CN'
                                    ? '正在为你定位第一节未完成的课时。'
                                    : 'Locating the first unfinished lesson for you.'}
                            </p>
                          </div>

                          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:mt-auto">
                            {isPathLoading ? (
                              <button
                                type="button"
                                className="viewer-botanical-button viewer-botanical-button--primary"
                                disabled
                              >
                                {language === 'zh-CN' ? '准备下一课…' : 'Preparing next lesson…'}
                              </button>
                            ) : (
                              <Link
                                to={continueTarget.href}
                                data-testid="home-continue-link"
                                className="viewer-botanical-button viewer-botanical-button--primary"
                              >
                                {continueTarget.label}
                                <ArrowRight size={16} />
                              </Link>
                            )}
                            <Link
                              to={`/course/${selectedCourse.course.id}`}
                              className="viewer-botanical-button viewer-botanical-button--secondary"
                            >
                              {language === 'zh-CN' ? '查看课程' : 'View course'}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex flex-1 flex-col justify-between gap-4">
                      <div className="max-w-[34rem]">
                        <h2
                          className="text-[2.1rem] font-semibold leading-none text-[#3d342a]"
                          style={{ fontFamily: '"Cormorant Garamond", serif' }}
                        >
                          {language === 'zh-CN' ? '还没有当前学习课程' : 'No current course yet'}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-[#72665b]">
                          {language === 'zh-CN'
                            ? '先从课程库选一门你愿意开始的课程。选定后，首页会自动锁定当前课程、下一课入口和今日建议。'
                            : 'Pick a course from the library first. Once selected, home will lock onto the current course, next lesson entry, and today’s recommendation.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link to="/library" className="viewer-botanical-button viewer-botanical-button--primary">
                          <Search size={18} />
                          {copy.home.libraryCta}
                        </Link>
                        <Link to="/ai-tutor" className="viewer-botanical-button viewer-botanical-button--secondary">
                          <BrainCircuit size={18} />
                          {language === 'zh-CN' ? '先看看 AI 导师' : 'Open AI Tutor'}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {courseSwitcher ? <div className="relative z-10 pt-1">{courseSwitcher}</div> : null}
            </div>
          </div>

          <div className="grid gap-4 xl:pt-[22rem]">
            <div data-testid="home-coach-card" className="rounded-[30px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] p-5 shadow-[0_16px_34px_rgba(90,70,50,0.08)] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="viewer-botanical-pill border-[#d6c4b2] bg-[#f7efe2] text-[#8b7153]">
                  <Bot size={15} />
                  {language === 'zh-CN' ? 'AI 学习教练' : 'AI Study Coach'}
                </span>
                <span className="viewer-botanical-pill border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]">
                  {coachState.accentLabel}
                </span>
              </div>

              <h2
                className="mt-4 text-[2rem] font-semibold leading-none text-[#3d342a]"
                style={{ fontFamily: '"Cormorant Garamond", serif' }}
              >
                {coachState.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#72665b]">{coachState.message}</p>

              <div className="mt-5 rounded-[22px] border border-[#e4d8ca] bg-[rgba(255,255,255,0.52)] px-4 py-4">
                <p className="text-sm leading-7 text-[#72665b]">{coachState.supportingNote}</p>
              </div>
            </div>
          </div>
        </div>

        {detailQuery.error && selectedEnrollment ? (
          <div className="relative z-10 mt-4">
            <ErrorStateCard
              title={language === 'zh-CN' ? '课程路径暂时未同步' : 'Course path is not synced yet'}
              message={
                detailQuery.error instanceof Error
                  ? detailQuery.error.message
                  : language === 'zh-CN'
                    ? '请重新加载当前课程路径。'
                    : 'Try reloading the current course path.'
              }
              onRetry={() => {
                void detailQuery.refetch();
              }}
            />
          </div>
        ) : null}
      </section>

      <div
        ref={companionRef}
        data-testid="home-live2d-stage"
        className={[
          'absolute z-20 w-[42vw] max-w-[30rem] min-w-[15rem] touch-none select-none',
          isDraggingCompanion ? 'cursor-grabbing' : 'cursor-grab',
        ].join(' ')}
        style={{
          left: `${companionPosition.x}px`,
          top: `${companionPosition.y}px`,
        }}
        onPointerDown={handleCompanionPointerDown}
        onPointerMove={handleCompanionPointerMove}
        onPointerUp={handleCompanionPointerUp}
        onPointerCancel={handleCompanionPointerUp}
      >
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.78),rgba(255,255,255,0)_62%)]" />
        <div className="pointer-events-none absolute inset-x-[18%] bottom-[9%] h-10 rounded-full bg-[radial-gradient(circle,rgba(114,93,73,0.18),rgba(114,93,73,0)_72%)] blur-xl" />
        <div className="relative h-[18rem] md:h-[24rem]">
          <Live2DHeroModel />
        </div>
      </div>
    </div>
  );
}
