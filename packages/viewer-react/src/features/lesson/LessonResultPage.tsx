import { Link, useLocation } from 'react-router-dom';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { viewerCopy } from '@/shared/theme/copy';

type ResultState = {
  lessonTitle?: string;
  xpAwarded?: number;
  correctCount?: number;
  totalCount?: number;
  pageCount?: number;
  unlockedAchievements?: Array<{ id: string; name: string }>;
  courseCompleted?: boolean;
};

export function LessonResultPage() {
  const location = useLocation();
  const state = (location.state ?? {}) as ResultState;

  return (
    <PageContainer title={viewerCopy.result.title} subtitle={`Finished: ${state.lessonTitle ?? viewerCopy.lesson.titleFallback}`}>
      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">XP awarded</p>
          <p className="mt-3 text-4xl font-black text-[var(--viewer-text)]">{state.xpAwarded ?? 0}</p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">Correct answers</p>
          <p className="mt-3 text-4xl font-black text-[var(--viewer-text)]">
            {state.correctCount ?? 0}/{state.totalCount ?? 0}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">Pages completed</p>
          <p className="mt-3 text-4xl font-black text-[var(--viewer-text)]">{state.pageCount ?? 0}</p>
        </SurfaceCard>
      </div>

      {state.unlockedAchievements?.length ? (
        <SurfaceCard className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">Unlocked achievements</p>
          {state.unlockedAchievements.map((achievement) => (
            <div key={achievement.id} className="rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--viewer-text)]">
              {achievement.name}
            </div>
          ))}
        </SurfaceCard>
      ) : null}

      {state.courseCompleted ? (
        <SurfaceCard>
          <p className="text-sm font-semibold text-[var(--viewer-text)]">This lesson completed the course enrollment.</p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="flex flex-wrap gap-3">
        <Link
          to="/home"
          className="rounded-2xl bg-[var(--viewer-primary)] px-5 py-3 text-sm font-black text-white"
        >
          {viewerCopy.result.primary}
        </Link>
        <Link
          to="/library"
          className="rounded-2xl border border-[var(--viewer-border)] px-5 py-3 text-sm font-black text-[var(--viewer-text)]"
        >
          {viewerCopy.result.secondary}
        </Link>
      </SurfaceCard>
    </PageContainer>
  );
}
