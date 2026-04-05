import { Link, useLocation } from 'react-router-dom';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { useViewerCopy } from '@/shared/theme/copy';

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
  const copy = useViewerCopy();
  const state = (location.state ?? {}) as ResultState;

  return (
    <PageContainer title={copy.result.title} subtitle={`${copy.result.finishedPrefix}${state.lessonTitle ?? copy.lesson.titleFallback}`}>
      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(247,242,231,0.9)_100%)]">
          <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.xpAwarded}</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--viewer-text)]">{state.xpAwarded ?? 0}</p>
        </SurfaceCard>
        <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(238,245,236,0.88)_100%)]">
          <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.correctAnswers}</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--viewer-text)]">
            {state.correctCount ?? 0}/{state.totalCount ?? 0}
          </p>
        </SurfaceCard>
        <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(244,235,223,0.9)_100%)]">
          <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.pagesCompleted}</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--viewer-text)]">{state.pageCount ?? 0}</p>
        </SurfaceCard>
      </div>

      {state.unlockedAchievements?.length ? (
        <SurfaceCard className="space-y-3">
          <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.unlockedAchievements}</p>
          {state.unlockedAchievements.map((achievement) => (
            <div key={achievement.id} className="rounded-[20px] border border-[#dfd3c4] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-sm font-semibold text-[var(--viewer-text)]">
              {achievement.name}
            </div>
          ))}
        </SurfaceCard>
      ) : null}

      {state.courseCompleted ? (
        <SurfaceCard className="bg-[rgba(255,252,247,0.88)]">
          <p className="text-sm font-semibold text-[var(--viewer-text)]">{copy.result.courseCompleted}</p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="flex flex-wrap gap-3">
        <Link
          to="/home"
          className="viewer-botanical-button viewer-botanical-button--primary"
        >
          {copy.result.primary}
        </Link>
        <Link
          to="/library"
          className="viewer-botanical-button viewer-botanical-button--secondary"
        >
          {copy.result.secondary}
        </Link>
      </SurfaceCard>
    </PageContainer>
  );
}
