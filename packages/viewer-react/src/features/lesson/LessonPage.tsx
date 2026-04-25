import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchLessonCommunityNote, saveCommunityNote } from '@/shared/api/viewer/communityApi';
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
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const copy = useViewerCopy();
  const lessonId = params.lessonId ?? '';
  const userId = user?.id ?? '';

  const runtimeQuery = useQuery({
    queryKey: ['viewer', 'lesson', lessonId],
    queryFn: () => fetchLessonRuntime(lessonId),
    enabled: Boolean(lessonId),
  });
  const lessonNoteQuery = useQuery({
    queryKey: ['viewer', 'lesson-note', userId, lessonId],
    queryFn: () => fetchLessonCommunityNote(userId, lessonId),
    enabled: Boolean(userId && lessonId),
  });

  const completionMutation = useMutation({
    mutationFn: (summary: LessonCompletionSummary) =>
      completeLesson(userId, lessonId, {
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
      const courseId = runtimeQuery.data?.courseId ?? null;
      void Promise.all([
        courseId
          ? queryClient.invalidateQueries({ queryKey: ['viewer', 'course', courseId, user?.id] })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ['viewer', 'enrollments', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['viewer', 'home', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['viewer', 'stats', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['viewer', 'xp-history', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['viewer', 'achievements', user?.id] }),
      ]);
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
  const noteMutation = useMutation({
    mutationFn: (body: string) => {
      const existingNote = lessonNoteQuery.data;
      return saveCommunityNote(userId, {
        id: existingNote?.id,
        title: existingNote?.title ?? runtimeQuery.data?.title ?? copy.lesson.titleFallback,
        body,
        room_id: null,
        lesson_id: lessonId,
      });
    },
    onSuccess: async (savedNote) => {
      queryClient.setQueryData(['viewer', 'lesson-note', userId, lessonId], savedNote);
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'community', userId] });
      captureViewerEvent('viewer_lesson_note_saved', { lessonId, noteId: savedNote.id });
    },
    onError: (error) => {
      captureViewerError(error, { area: 'lesson_note_save', lessonId });
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

  useEffect(() => {
    if (!lessonId) {
      return;
    }

    void import('@/features/lesson/LessonResultPage').catch(() => undefined);
  }, [lessonId]);

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
    <PageContainer title={runtimeQuery.data.title} subtitle={copy.lesson.runtimeSubtitle} headerHidden className="min-h-full pb-0">
      <LessonRuntimePlayer
        data={runtimeQuery.data}
        onExit={() =>
          navigate(runtimeQuery.data?.courseId ? `/course/${runtimeQuery.data.courseId}` : '/home')
        }
        onComplete={(summary) => completionMutation.mutate(summary)}
        lessonNote={lessonNoteQuery.data ?? null}
        lessonNoteLoading={lessonNoteQuery.isLoading}
        lessonNoteSaving={noteMutation.isPending}
        onSaveNote={(body) => noteMutation.mutateAsync(body)}
      />
      {noteMutation.error instanceof Error ? (
        <ErrorStateCard
          message={noteMutation.error.message}
          onRetry={() => noteMutation.reset()}
        />
      ) : null}
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
