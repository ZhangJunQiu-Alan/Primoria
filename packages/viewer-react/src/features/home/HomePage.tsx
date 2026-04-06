import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeHelp,
  BookOpenText,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Compass,
  GitBranch,
  NotebookPen,
  Search,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAiTutorPersonaDefinition } from '@/shared/ai-tutor/persona';
import { useBootSplashGate } from '@/shared/boot/bootSplash';
import { fetchViewerHomePayload } from '@/shared/api/viewer/homeApi';
import { prefetchCourseDetail, prefetchHomePayload, prefetchLibraryCatalog } from '@/shared/api/viewer/prefetch';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';
import { publicAssetPath } from '@/shared/utils/publicAsset';
import { Live2DHeroModel } from './Live2DHeroModel';
import {
  clearPersistedHomeCourseId,
  getHomeContinueTarget,
  getHomeSelectedCourse,
  readPersistedHomeCourseId,
  sortHomeInProgressEnrollments,
  writePersistedHomeCourseId,
} from './homeDashboard';
import {
  getHomeCompanionInsight,
  getHomeCompanionPlacement,
  type HomeCompanionAnchor,
  type HomeCompanionRecommendationPace,
} from './homeCompanion';

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

const COMPANION_DRAG_THRESHOLD_PX = 8;

export function HomePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const language = useAppSelector((state) => state.viewerPreferences.language);
  const aiTutorPersona = useAppSelector((state) => state.viewerPreferences.aiTutorPersona);
  const homeCompanionEnabled = useAppSelector((state) => state.viewerPreferences.homeCompanionEnabled);
  const copy = useViewerCopy();
  const aiTutorPersonaCopy = getAiTutorPersonaDefinition(aiTutorPersona, language);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [cardMotionDirection, setCardMotionDirection] = useState<'forward' | 'backward' | null>(null);
  const [companionPosition, setCompanionPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCompanion, setIsDraggingCompanion] = useState(false);
  const [hasInitializedCompanion, setHasInitializedCompanion] = useState(false);
  const [isCompanionPopoverOpen, setIsCompanionPopoverOpen] = useState(false);
  const [isRecommendationPromptOpen, setIsRecommendationPromptOpen] = useState(false);
  const [companionPopoverPlacement, setCompanionPopoverPlacement] = useState<{
    anchor: HomeCompanionAnchor;
    x: number;
    y: number;
  }>({ anchor: 'left', x: 24, y: 24 });
  const pageRef = useRef<HTMLDivElement | null>(null);
  const companionRef = useRef<HTMLDivElement | null>(null);
  const companionPopoverRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    originClientX: number;
    originClientY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setSelectedCourseId(null);
      return;
    }

    setSelectedCourseId(readPersistedHomeCourseId(user.id));
  }, [user?.id]);

  const homeQuery = useQuery({
    queryKey: ['viewer', 'home', user?.id, selectedCourseId ?? null],
    queryFn: () => fetchViewerHomePayload(user?.id ?? 'demo-user', selectedCourseId ?? null),
    enabled: Boolean(user?.id),
    placeholderData: keepPreviousData,
  });

  const homePayload = homeQuery.data;
  const inProgressEnrollments = sortHomeInProgressEnrollments(homePayload?.in_progress_enrollments ?? []);
  const resolvedSelectedCourseId = homePayload?.resolved_selected_course_id ?? null;
  const selectedCourseDetail = homePayload?.selected_course_detail ?? null;

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (homeQuery.isPlaceholderData) {
      return;
    }

    if (!inProgressEnrollments.length) {
      clearPersistedHomeCourseId(user.id);
      if (selectedCourseId !== null) {
        setSelectedCourseId(null);
      }
      return;
    }

    if (resolvedSelectedCourseId) {
      writePersistedHomeCourseId(user.id, resolvedSelectedCourseId);
    }

    if (resolvedSelectedCourseId !== selectedCourseId) {
      setSelectedCourseId(resolvedSelectedCourseId);
    }
  }, [homeQuery.isPlaceholderData, inProgressEnrollments.length, resolvedSelectedCourseId, selectedCourseId, user?.id]);

  const requestedSelectedEnrollment =
    selectedCourseId ? inProgressEnrollments.find((entry) => entry.course_id === selectedCourseId) ?? null : null;

  const selectedEnrollment =
    requestedSelectedEnrollment ??
    (resolvedSelectedCourseId
      ? inProgressEnrollments.find((entry) => entry.course_id === resolvedSelectedCourseId) ?? null
      : null) ??
    inProgressEnrollments[0] ??
    null;

  const activeCourseId = requestedSelectedEnrollment?.course_id ?? selectedEnrollment?.course_id ?? selectedCourseId;
  const detailMatchesSelection = selectedCourseDetail?.course.id === selectedEnrollment?.course_id;
  const selectedCourse = getHomeSelectedCourse(
    selectedEnrollment,
    language,
    detailMatchesSelection ? selectedCourseDetail : null,
  );
  const continueTarget = getHomeContinueTarget(
    selectedEnrollment,
    language,
    detailMatchesSelection ? selectedCourseDetail : null,
  );
  const stats = homePayload?.stats;
  const pageError = homeQuery.error;
  const isPathLoading = Boolean(selectedEnrollment && homeQuery.isFetching && !detailMatchesSelection);
  const selectedCourseIndex = selectedEnrollment
    ? inProgressEnrollments.findIndex((entry) => entry.course_id === selectedEnrollment.course_id)
    : -1;
  const previousEnrollment = selectedCourseIndex > 0 ? inProgressEnrollments[selectedCourseIndex - 1] : null;
  const nextEnrollment =
    selectedCourseIndex >= 0 && selectedCourseIndex < inProgressEnrollments.length - 1
      ? inProgressEnrollments[selectedCourseIndex + 1]
      : null;
  const companionInsight = getHomeCompanionInsight({
    persona: aiTutorPersonaCopy,
    selectedCourse,
    stats,
  });

  useBootSplashGate(Boolean(homeQuery.data || homeQuery.error));

  useEffect(() => {
    if (!user?.id || !selectedEnrollment) {
      return;
    }

    const cleanupPrev = previousEnrollment
      ? prefetchHomePayload(queryClient, user.id, previousEnrollment.course_id, { idle: true })
      : null;
    const cleanupPrevDetail = previousEnrollment
      ? prefetchCourseDetail(queryClient, previousEnrollment.course_id, user.id, { idle: true })
      : null;
    const cleanupNext = nextEnrollment
      ? prefetchHomePayload(queryClient, user.id, nextEnrollment.course_id, { idle: true })
      : null;
    const cleanupNextDetail = nextEnrollment
      ? prefetchCourseDetail(queryClient, nextEnrollment.course_id, user.id, { idle: true })
      : null;

    return () => {
      cleanupPrev?.();
      cleanupPrevDetail?.();
      cleanupNext?.();
      cleanupNextDetail?.();
    };
  }, [nextEnrollment?.course_id, previousEnrollment?.course_id, queryClient, selectedEnrollment?.course_id, user?.id]);

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
          const isActive = entry.course_id === activeCourseId;
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
              onMouseEnter={() => {
                if (!user?.id) {
                  return;
                }
                prefetchHomePayload(queryClient, user.id, entry.course_id, { idle: true });
                prefetchCourseDetail(queryClient, entry.course_id, user.id, { idle: true });
              }}
              onFocus={() => {
                if (!user?.id) {
                  return;
                }
                prefetchHomePayload(queryClient, user.id, entry.course_id, { idle: true });
                prefetchCourseDetail(queryClient, entry.course_id, user.id, { idle: true });
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
    if (!homeCompanionEnabled) {
      setIsCompanionPopoverOpen(false);
      setIsRecommendationPromptOpen(false);
      return;
    }

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
  }, [hasInitializedCompanion, homeCompanionEnabled]);

  useEffect(() => {
    return () => {
      dragStateRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!homeCompanionEnabled || !isCompanionPopoverOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      setIsCompanionPopoverOpen(false);
      setIsRecommendationPromptOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [homeCompanionEnabled, isCompanionPopoverOpen]);

  useEffect(() => {
    if (!homeCompanionEnabled || !isCompanionPopoverOpen) {
      return;
    }

    const page = pageRef.current;
    const companion = companionRef.current;
    const popover = companionPopoverRef.current;
    if (!page || !companion || !popover) {
      return;
    }

    const updatePlacement = () => {
      setCompanionPopoverPlacement(
        getHomeCompanionPlacement({
          containerWidth: page.clientWidth || page.getBoundingClientRect().width,
          containerHeight: page.clientHeight || page.getBoundingClientRect().height,
          anchorX: companionPosition.x,
          anchorY: companionPosition.y,
          anchorWidth: companion.offsetWidth || 280,
          anchorHeight: companion.offsetHeight || 360,
          popoverWidth: popover.offsetWidth || 320,
          popoverHeight: popover.offsetHeight || 360,
          viewportWidth: window.innerWidth,
          bottomInset: 18,
        }),
      );
    };

    updatePlacement();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updatePlacement()) : null;
    resizeObserver?.observe(page);
    resizeObserver?.observe(companion);
    resizeObserver?.observe(popover);
    window.addEventListener('resize', updatePlacement);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePlacement);
    };
  }, [companionPosition.x, companionPosition.y, homeCompanionEnabled, isCompanionPopoverOpen, isRecommendationPromptOpen]);

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
      originClientX: event.clientX,
      originClientY: event.clientY,
      moved: false,
    };

    if (typeof companion.setPointerCapture === 'function') {
      companion.setPointerCapture(event.pointerId);
    }
    setIsDraggingCompanion(false);
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

    const distance = Math.hypot(
      event.clientX - dragState.originClientX,
      event.clientY - dragState.originClientY,
    );

    if (!dragState.moved && distance < COMPANION_DRAG_THRESHOLD_PX) {
      return;
    }

    if (!dragState.moved) {
      dragState.moved = true;
      setIsDraggingCompanion(true);
      setIsCompanionPopoverOpen(false);
      setIsRecommendationPromptOpen(false);
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
    if (companion?.hasPointerCapture?.(event.pointerId)) {
      companion.releasePointerCapture(event.pointerId);
    }
    const wasDrag = dragState.moved;
    setIsDraggingCompanion(false);

    if (!wasDrag) {
      setIsCompanionPopoverOpen((current) => !current);
      setIsRecommendationPromptOpen(false);
    }
  };

  const handleCompanionPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    const companion = companionRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    if (companion?.hasPointerCapture?.(event.pointerId)) {
      companion.releasePointerCapture(event.pointerId);
    }
    setIsDraggingCompanion(false);
  };

  function buildAiTutorIntentHref(intent: 'quiz' | 'mindmap') {
    const params = new URLSearchParams({
      source: 'home-companion',
      intent,
      courseId: selectedCourse?.course.id ?? '',
      courseTitle: selectedCourse?.course.title ?? '',
    });
    return `/ai-tutor?${params.toString()}`;
  }

  function buildCommunityNotesHref() {
    const params = new URLSearchParams({
      source: 'home-companion',
      section: 'notes',
      topic: selectedCourse?.course.title ?? '',
    });
    return `/community?${params.toString()}`;
  }

  function handleCompanionNavigation(to: string) {
    setIsCompanionPopoverOpen(false);
    setIsRecommendationPromptOpen(false);
    navigate(to);
  }

  function handleRecommendationNavigate(pace: HomeCompanionRecommendationPace) {
    if (!selectedCourse) {
      return;
    }

    const params = new URLSearchParams({
      source: 'home-companion',
      subjectId: selectedCourse.course.subject_id,
      recommendFrom: selectedCourse.course.id,
      recommendPace: pace,
    });

    handleCompanionNavigation(`/library?${params.toString()}`);
  }

  if (homeQuery.isLoading && !homeQuery.data) {
    return (
      <div className="px-5 py-6 md:px-9 md:py-8">
        <LoadingStateCard />
      </div>
    );
  }

  if (pageError) {
    const errorRecord = pageError as { message?: unknown } | null;
    const message = pageError instanceof Error ? pageError.message : typeof errorRecord?.message === 'string' ? errorRecord.message : undefined;
    return (
      <div className="px-5 py-6 md:px-9 md:py-8">
        <ErrorStateCard
          message={message}
          onRetry={() => {
            void homeQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={pageRef}
      className="relative mx-auto flex min-h-[calc(100svh-86px)] w-full max-w-[1320px] flex-col px-5 pb-6 pt-1.5 md:px-8 md:pb-8 md:pt-2"
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

      <section className="relative mt-6">
        <div className="grid gap-6">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
            <div className="w-full">
              <div className="relative">
                {selectedCourse && previousEnrollment ? (
                  <button
                    type="button"
                    data-testid="home-edge-prev"
                    aria-label={copy.home.previousCourse}
                    className="viewer-button-flat absolute bottom-14 left-[-0.7rem] top-10 z-20 flex w-8 items-center justify-start rounded-full bg-[linear-gradient(90deg,rgba(249,243,234,0.96)_0%,rgba(249,243,234,0.08)_100%)] pl-1.5 text-[#8a7765] opacity-72 transition duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#adc9b0] sm:w-10 sm:pl-2"
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
                    className="viewer-button-flat absolute bottom-14 right-[-0.7rem] top-10 z-20 flex w-8 items-center justify-end rounded-full bg-[linear-gradient(270deg,rgba(249,243,234,0.96)_0%,rgba(249,243,234,0.08)_100%)] pr-1.5 text-[#8a7765] opacity-72 transition duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#adc9b0] sm:w-10 sm:pr-2"
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
                                aiTutorPersonaCopy.homeCourseDescriptionFallback}
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
                                ? aiTutorPersonaCopy.homeNextStepMessage(selectedCourse.nextLessonDurationLabel)
                                : aiTutorPersonaCopy.homeSyncingMessage}
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
                                onMouseEnter={() => {
                                  if (continueTarget.kind !== 'course' || !selectedCourse?.course.id || !user?.id) {
                                    return;
                                  }
                                  prefetchCourseDetail(queryClient, selectedCourse.course.id, user.id, { idle: true });
                                }}
                                onFocus={() => {
                                  if (continueTarget.kind !== 'course' || !selectedCourse?.course.id || !user?.id) {
                                    return;
                                  }
                                  prefetchCourseDetail(queryClient, selectedCourse.course.id, user.id, { idle: true });
                                }}
                              >
                                {continueTarget.label}
                                <ArrowRight size={16} />
                              </Link>
                            )}
                            <Link
                              to={`/course/${selectedCourse.course.id}`}
                              className="viewer-botanical-button viewer-botanical-button--secondary"
                              onMouseEnter={() => {
                                if (!user?.id) {
                                  return;
                                }
                                prefetchCourseDetail(queryClient, selectedCourse.course.id, user.id, { idle: true });
                              }}
                              onFocus={() => {
                                if (!user?.id) {
                                  return;
                                }
                                prefetchCourseDetail(queryClient, selectedCourse.course.id, user.id, { idle: true });
                              }}
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
                        <Link
                          to="/library"
                          className="viewer-botanical-button viewer-botanical-button--primary"
                          onMouseEnter={() => {
                            prefetchLibraryCatalog(queryClient, { searchQuery: '', subjectId: null }, { idle: true });
                          }}
                          onFocus={() => {
                            prefetchLibraryCatalog(queryClient, { searchQuery: '', subjectId: null }, { idle: true });
                          }}
                        >
                          <Search size={18} />
                          {copy.home.libraryCta}
                        </Link>
                        <Link to="/ai-tutor" className="viewer-botanical-button viewer-botanical-button--secondary">
                          <BrainCircuit size={18} />
                          {aiTutorPersonaCopy.homeTutorCta}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {courseSwitcher ? <div className="relative z-10 pt-1">{courseSwitcher}</div> : null}
            </div>
          </div>

        </div>
      </section>

      {homeCompanionEnabled ? (
        <>
          {isCompanionPopoverOpen ? (
            <button
              type="button"
              data-testid="home-companion-dismiss-layer"
              aria-label={language === 'zh-CN' ? '关闭导师窗口' : 'Close tutor panel'}
              className="absolute inset-0 z-30 cursor-default bg-transparent"
              onClick={() => {
                setIsCompanionPopoverOpen(false);
                setIsRecommendationPromptOpen(false);
              }}
            />
          ) : null}

          <div
            ref={companionRef}
            data-testid="home-live2d-stage"
            className={[
              'absolute w-[42vw] max-w-[30rem] min-w-[15rem] touch-none select-none',
              isCompanionPopoverOpen ? 'z-50' : 'z-20',
              isDraggingCompanion ? 'cursor-grabbing' : 'cursor-grab',
            ].join(' ')}
            style={{
              left: `${companionPosition.x}px`,
              top: `${companionPosition.y}px`,
            }}
            onPointerDown={handleCompanionPointerDown}
            onPointerMove={handleCompanionPointerMove}
            onPointerUp={handleCompanionPointerUp}
            onPointerCancel={handleCompanionPointerCancel}
          >
            <div className="pointer-events-none absolute inset-x-[18%] bottom-[9%] h-10 rounded-full bg-[radial-gradient(circle,rgba(114,93,73,0.18),rgba(114,93,73,0)_72%)] blur-xl" />
            <div className="relative h-[18rem] md:h-[24rem]">
              <Live2DHeroModel />
            </div>
          </div>

          {isCompanionPopoverOpen ? (
            <div
              ref={companionPopoverRef}
              data-testid="home-companion-popover"
              data-anchor={companionPopoverPlacement.anchor}
              className={[
                'absolute z-[60] w-[min(22rem,calc(100%-2rem))] rounded-[28px] border border-[#dbcdbd] bg-[rgba(255,252,247,0.96)] p-4 text-left shadow-[0_22px_44px_rgba(90,70,50,0.14)] backdrop-blur-[20px]',
                companionPopoverPlacement.anchor === 'sheet'
                  ? 'left-4 right-4 w-auto'
                  : '',
              ].join(' ')}
              style={{
                left: companionPopoverPlacement.anchor === 'sheet' ? undefined : `${companionPopoverPlacement.x}px`,
                top: `${companionPopoverPlacement.y}px`,
                right: companionPopoverPlacement.anchor === 'sheet' ? '1rem' : undefined,
              }}
            >
              <div className="min-w-0">
                <p className="viewer-botanical-eyebrow text-[0.66rem]">{aiTutorPersonaCopy.homeCompanionTitle}</p>
                <p className="mt-2 text-[0.94rem] font-semibold leading-7 text-[#4d4239]">
                  {companionInsight.message}
                </p>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  className="rounded-[20px] border border-[#d7ccb8] bg-[rgba(255,252,247,0.88)] p-3 text-left transition hover:border-[#c8dbcb] hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedCourse}
                  onClick={() => handleCompanionNavigation(buildAiTutorIntentHref('quiz'))}
                >
                  <BadgeHelp size={16} className="text-[#9a6f3f]" />
                  <div className="mt-4 text-[0.86rem] font-bold text-[#3d342a]">
                    {aiTutorPersonaCopy.homeCompanionActions.quiz.label}
                  </div>
                  <div className="mt-1 text-[0.76rem] font-medium leading-5 text-[#8b7d72]">
                    {aiTutorPersonaCopy.homeCompanionActions.quiz.subtitle}
                  </div>
                </button>

                <button
                  type="button"
                  className="rounded-[20px] border border-[#d7ccb8] bg-[rgba(255,252,247,0.88)] p-3 text-left transition hover:border-[#c8dbcb] hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedCourse}
                  onClick={() => handleCompanionNavigation(buildAiTutorIntentHref('mindmap'))}
                >
                  <GitBranch size={16} className="text-[#7f6f88]" />
                  <div className="mt-4 text-[0.86rem] font-bold text-[#3d342a]">
                    {aiTutorPersonaCopy.homeCompanionActions.mindmap.label}
                  </div>
                  <div className="mt-1 text-[0.76rem] font-medium leading-5 text-[#8b7d72]">
                    {aiTutorPersonaCopy.homeCompanionActions.mindmap.subtitle}
                  </div>
                </button>

                <button
                  type="button"
                  className="rounded-[20px] border border-[#d7ccb8] bg-[rgba(255,252,247,0.88)] p-3 text-left transition hover:border-[#c8dbcb] hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedCourse}
                  onClick={() => handleCompanionNavigation(buildCommunityNotesHref())}
                >
                  <NotebookPen size={16} className="text-[#5c7d60]" />
                  <div className="mt-4 text-[0.86rem] font-bold text-[#3d342a]">
                    {aiTutorPersonaCopy.homeCompanionActions.notes.label}
                  </div>
                  <div className="mt-1 text-[0.76rem] font-medium leading-5 text-[#8b7d72]">
                    {aiTutorPersonaCopy.homeCompanionActions.notes.subtitle}
                  </div>
                </button>

                <button
                  type="button"
                  className="rounded-[20px] border border-[#d7ccb8] bg-[rgba(255,252,247,0.88)] p-3 text-left transition hover:border-[#c8dbcb] hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedCourse}
                  onClick={() => setIsRecommendationPromptOpen((current) => !current)}
                >
                  <Compass size={16} className="text-[#8d6438]" />
                  <div className="mt-4 text-[0.86rem] font-bold text-[#3d342a]">
                    {aiTutorPersonaCopy.homeCompanionActions.recommend.label}
                  </div>
                  <div className="mt-1 text-[0.76rem] font-medium leading-5 text-[#8b7d72]">
                    {aiTutorPersonaCopy.homeCompanionActions.recommend.subtitle}
                  </div>
                </button>
              </div>

              {isRecommendationPromptOpen ? (
                <div className="mt-4 rounded-[22px] border border-[#ddd3c3] bg-[rgba(250,246,239,0.92)] p-3.5">
                  <p className="text-[0.82rem] font-semibold text-[#6f6359]">
                    {aiTutorPersonaCopy.homeCompanionRecommendPrompt}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      className="rounded-full border border-[#ddd3c3] bg-white px-3 py-2 text-[0.78rem] font-bold text-[#6e6156] transition hover:border-[#d6c8b5] hover:bg-[#fdf9f2]"
                      onClick={() => handleRecommendationNavigate('easier')}
                    >
                      {aiTutorPersonaCopy.homeCompanionRecommendChoices.easier}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[#ddd3c3] bg-white px-3 py-2 text-[0.78rem] font-bold text-[#6e6156] transition hover:border-[#d6c8b5] hover:bg-[#fdf9f2]"
                      onClick={() => handleRecommendationNavigate('same')}
                    >
                      {aiTutorPersonaCopy.homeCompanionRecommendChoices.same}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[#ddd3c3] bg-white px-3 py-2 text-[0.78rem] font-bold text-[#6e6156] transition hover:border-[#d6c8b5] hover:bg-[#fdf9f2]"
                      onClick={() => handleRecommendationNavigate('harder')}
                    >
                      {aiTutorPersonaCopy.homeCompanionRecommendChoices.harder}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
