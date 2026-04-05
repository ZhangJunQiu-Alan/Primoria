import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpenText, Bot, BrainCircuit, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchCourseDetail, fetchEnrollments } from '@/shared/api/viewer/catalogApi';
import { fetchUserStats } from '@/shared/api/viewer/profileApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { useAppSelector } from '@/shared/state/store';
import { viewerCopy } from '@/shared/theme/copy';
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

function formatHeroCourseTitle(title: string) {
  const trimmed = title.trim();
  if (trimmed.length <= 26) {
    return trimmed;
  }

  return `${trimmed.slice(0, 24)}…`;
}

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
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
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

  const selectedCourse = getHomeSelectedCourse(selectedEnrollment, detailQuery.data ?? null);
  const continueTarget = getHomeContinueTarget(selectedEnrollment, detailQuery.data ?? null);
  const stats = statsQuery.data;
  const coachState = buildHomeCoachState({
    stats,
    selectedCourse,
    continueTarget,
  });

  const homeHeading = selectedCourse ? `继续 ${formatHeroCourseTitle(selectedCourse.course.title)}` : '今天开始学习';
  const pageError = statsQuery.error ?? enrollmentsQuery.error;
  const isPathLoading = Boolean(selectedEnrollment && detailQuery.isLoading && !detailQuery.data);

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

      <section className="viewer-panel relative mt-8 overflow-hidden rounded-[34px] px-5 py-5 md:px-8 md:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.62),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(168,197,172,0.16),transparent_22%),radial-gradient(circle_at_82%_82%,rgba(196,149,106,0.12),transparent_24%)]" />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <div className="flex flex-col gap-5">
            <div>
              <h1
                className="text-[clamp(2.5rem,4vw,4rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#3d342a]"
                style={{ fontFamily: '"Cormorant Garamond", serif' }}
              >
                {homeHeading}
              </h1>
            </div>

            {inProgressEnrollments.length ? (
              <div
                data-testid="home-course-switcher"
                className="grid max-w-[44rem] grid-cols-2 gap-2"
              >
                {inProgressEnrollments.map((entry) => {
                  const isActive = entry.course_id === selectedEnrollment?.course_id;
                  return (
                    <button
                      key={entry.course_id}
                      type="button"
                      className={[
                        'flex min-w-0 items-center gap-2 rounded-[18px] border px-3 py-2.5 text-left text-[0.84rem] font-semibold leading-5 transition',
                        isActive
                          ? 'border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60] shadow-[0_10px_24px_rgba(122,158,126,0.12)]'
                          : 'border-[#ddd3c3] bg-[rgba(255,252,247,0.84)] text-[#76685c] hover:border-[#cdbfae] hover:bg-[rgba(255,252,247,0.96)]',
                      ].join(' ')}
                      onClick={() => {
                        setSelectedCourseId(entry.course_id);
                        if (user?.id) {
                          writePersistedHomeCourseId(user.id, entry.course_id);
                        }
                      }}
                    >
                      <BookOpenText size={15} className="shrink-0" />
                      <span className="min-w-0 break-words">{entry.courses.title}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div
              data-testid="home-current-course-card"
              className="rounded-[30px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.84)] p-5 shadow-[0_16px_34px_rgba(90,70,50,0.08)] md:p-6"
            >
              {selectedCourse ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="viewer-botanical-pill border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]">
                      {selectedCourse.course.subjects.name}
                    </span>
                    <span className="viewer-botanical-pill">{selectedCourse.difficultyLabel}</span>
                    <span className="viewer-botanical-pill">{selectedCourse.estimatedLabel}</span>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(220px,0.82fr)]">
                    <div>
                      <h2
                        className="text-[1.8rem] font-semibold leading-none text-[#3d342a] md:text-[2.35rem]"
                        style={{ fontFamily: '"Cormorant Garamond", serif' }}
                      >
                        {selectedCourse.course.title}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-[#72665b]">
                        {selectedCourse.course.description ||
                          '继续沿着当前课程推进。首页会替你定位下一步，并把今日建议收成更容易开始的动作。'}
                      </p>

                      <div className="mt-5 rounded-[24px] border border-[#e4d8ca] bg-[rgba(255,255,255,0.52)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="viewer-botanical-eyebrow text-[0.68rem]">{'当前进度'}</p>
                            <p className="mt-2 text-[2rem] font-semibold leading-none text-[#3d342a]">
                              {selectedCourse.progressPct}%
                            </p>
                          </div>
                          <div className="text-right text-sm leading-6 text-[#72665b]">
                            <p>
                              {selectedCourse.totalLessons
                                ? `已完成 ${selectedCourse.completedLessons} / ${selectedCourse.totalLessons} 节`
                                : '课程结构同步中'}
                            </p>
                            <p>{selectedCourse.lastAccessedLabel ? `上次进入 ${selectedCourse.lastAccessedLabel}` : '刚刚开始这门课'}</p>
                          </div>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-[#ebe3d6]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#c6d8c9_0%,#7a9e7e_100%)]"
                            style={{ width: `${selectedCourse.progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="order-first rounded-[24px] border border-[#d9ccb9] bg-[linear-gradient(180deg,rgba(255,252,247,0.96)_0%,rgba(249,243,234,0.92)_100%)] p-4 lg:order-none">
                      <p className="viewer-botanical-eyebrow text-[0.68rem]">{'下一步'}</p>
                      <h3
                        className="mt-3 text-[1.75rem] font-semibold leading-none text-[#3d342a]"
                        style={{ fontFamily: '"Cormorant Garamond", serif' }}
                      >
                        {selectedCourse.nextLessonTitle ?? '同步课程路径'}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[#72665b]">
                        {selectedCourse.nextLessonTitle
                          ? `建议先完成这一步，再进入 AI 导师整理重点。${selectedCourse.nextLessonDurationLabel ? `预计 ${selectedCourse.nextLessonDurationLabel}。` : ''}`
                          : detailQuery.error
                            ? '课程路径暂时没有同步成功，你仍然可以先打开课程页查看结构。'
                            : '正在为你定位第一节未完成的课时。'}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {isPathLoading ? (
                          <button
                            type="button"
                            className="viewer-botanical-button viewer-botanical-button--primary"
                            disabled
                          >
                            {'准备下一课…'}
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
                          {'查看课程'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-w-[34rem]">
                    <h2
                      className="text-[2.1rem] font-semibold leading-none text-[#3d342a]"
                      style={{ fontFamily: '"Cormorant Garamond", serif' }}
                    >
                      {'还没有当前学习课程'}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[#72665b]">
                      {'先从课程库选一门你愿意开始的课程。选定后，首页会自动锁定当前课程、下一课入口和今日建议。'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/library" className="viewer-botanical-button viewer-botanical-button--primary">
                      <Search size={18} />
                      {viewerCopy.home.libraryCta}
                    </Link>
                    <Link to="/ai-tutor" className="viewer-botanical-button viewer-botanical-button--secondary">
                      <BrainCircuit size={18} />
                      {'先看看 AI 导师'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:pt-[24rem]">
            <div data-testid="home-coach-card" className="rounded-[30px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] p-5 shadow-[0_16px_34px_rgba(90,70,50,0.08)] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="viewer-botanical-pill border-[#d6c4b2] bg-[#f7efe2] text-[#8b7153]">
                  <Bot size={15} />
                  {'AI 学习教练'}
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
              title="课程路径暂时未同步"
              message={detailQuery.error instanceof Error ? detailQuery.error.message : 'Try reloading the current course path.'}
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
