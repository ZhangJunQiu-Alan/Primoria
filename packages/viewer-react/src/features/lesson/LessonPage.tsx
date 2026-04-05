import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { completeLesson, fetchLessonRuntime } from '@/shared/api/viewer/lessonApi';
import { trackViewerAnalyticsEventOnce } from '@/shared/api/viewer/analyticsEvents';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { LessonRuntimePlayer, type LessonCompletionSummary } from '@/shared/lesson/LessonRuntimePlayer';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';

export function LessonPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const copy = useViewerCopy();
  const lessonId = params.lessonId ?? '';

  const runtimeQuery = useQuery({
    queryKey: ['viewer', 'lesson', lessonId],
    queryFn: () => fetchLessonRuntime(lessonId),
    enabled: Boolean(lessonId),
  });

  const completionMutation = useMutation({
    mutationFn: (summary: LessonCompletionSummary) =>
      completeLesson(user?.id ?? '', lessonId, {
        correctCount: summary.correctCount,
        totalCount: summary.totalCount,
        score: summary.totalCount > 0 ? Math.round((summary.correctCount / summary.totalCount) * 100) : 100,
        timeSpentSeconds: Math.max(summary.pageCount * 45, 45),
      }),
    onSuccess: (payload, summary) => {
      captureViewerEvent('viewer_lesson_completed', {
        lessonId,
        correctCount: summary.correctCount,
        totalCount: summary.totalCount,
        xpAwarded: Number(payload?.xp_earned ?? 0),
      });
      const xpAwarded = Number(payload?.xp_earned ?? 0);
      navigate(`/lesson/${lessonId}/result`, {
        state: {
          lessonTitle: runtimeQuery.data?.title ?? copy.lesson.titleFallback,
          xpAwarded,
          unlockedAchievements: payload?.unlocked_achievements ?? [],
          courseCompleted: payload?.course_completed ?? false,
          ...summary,
        },
      });
    },
    onError: (error) => {
      captureViewerError(error, { area: 'lesson_complete', lessonId });
    },
  });

  useEffect(() => {
    if (!runtimeQuery.data?.courseId || !lessonId) {
      return;
    }

    trackViewerAnalyticsEventOnce(`${location.key}:lesson:${lessonId}`, 'lesson_started', {
      courseId: runtimeQuery.data.courseId,
      lessonId,
    });
  }, [lessonId, location.key, runtimeQuery.data?.courseId]);

  if (runtimeQuery.isLoading) {
    return (
      <PageContainer title={copy.lesson.titleFallback} subtitle={copy.lesson.loadingRuntime}>
        <LoadingStateCard />
      </PageContainer>
    );
  }

  if (runtimeQuery.error) {
    return (
      <PageContainer title={copy.lesson.titleFallback} subtitle={copy.lesson.unavailable}>
        <ErrorStateCard
          message={runtimeQuery.error instanceof Error ? runtimeQuery.error.message : undefined}
          onRetry={() => void runtimeQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (!runtimeQuery.data) {
    return (
      <PageContainer title={copy.lesson.titleFallback} subtitle={copy.lesson.unavailable}>
        <SurfaceCard>
          <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">{copy.lesson.noSnapshot}</p>
        </SurfaceCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={runtimeQuery.data.title} subtitle={copy.lesson.runtimeSubtitle}>
      <LessonRuntimePlayer
        data={runtimeQuery.data}
        onExit={() =>
          navigate(runtimeQuery.data?.courseId ? `/course/${runtimeQuery.data.courseId}` : '/home')
        }
        onComplete={(summary) => completionMutation.mutate(summary)}
      />
      {completionMutation.error instanceof Error ? (
        <ErrorStateCard
          message={completionMutation.error.message}
          onRetry={() => completionMutation.reset()}
        />
      ) : null}
      {completionMutation.isPending ? (
        <SurfaceCard className="bg-[rgba(255,252,247,0.88)]">
          <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">{copy.lesson.finalizing}</p>
        </SurfaceCard>
      ) : null}
    </PageContainer>
  );
}
