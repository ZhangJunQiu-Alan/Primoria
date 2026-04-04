import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bindChildWithCode,
  fetchParentChildReport,
  fetchParentChildrenOverview,
  unbindChild,
} from '@/shared/api/viewer/parentApi';
import { EmptyStateCard, ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { viewerCopy } from '@/shared/theme/copy';

export function ParentDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [bindCodeInput, setBindCodeInput] = useState('');
  const [bindingStatus, setBindingStatus] = useState('');

  const childrenQuery = useQuery({
    queryKey: ['viewer', 'parent-children'],
    queryFn: fetchParentChildrenOverview,
  });

  useEffect(() => {
    if (!selectedChildId && childrenQuery.data?.[0]?.child_id) {
      setSelectedChildId(childrenQuery.data[0].child_id);
    }
  }, [childrenQuery.data, selectedChildId]);

  const reportQuery = useQuery({
    queryKey: ['viewer', 'parent-report', selectedChildId],
    queryFn: () => fetchParentChildReport(selectedChildId),
    enabled: Boolean(selectedChildId),
  });

  const bindChildMutation = useMutation({
    mutationFn: () => bindChildWithCode(bindCodeInput),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'parent-children'] });
      setSelectedChildId('');
      setBindCodeInput('');
      setBindingStatus(payload.ok ? 'Child bound.' : 'Binding failed.');
      captureViewerEvent('viewer_parent_bind_child', { ok: payload.ok });
    },
    onError: (error) => {
      setBindingStatus(error instanceof Error ? error.message : 'Binding failed.');
      captureViewerError(error, { area: 'parent_bind_child' });
    },
  });

  const unbindMutation = useMutation({
    mutationFn: () => unbindChild(selectedChildId),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'parent-children'] });
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'parent-report', selectedChildId] });
      setSelectedChildId('');
      setBindingStatus(payload.ok ? 'Child unbound.' : 'Unbind failed.');
      captureViewerEvent('viewer_parent_unbind_child', { ok: payload.ok });
    },
    onError: (error) => {
      setBindingStatus(error instanceof Error ? error.message : 'Unbind failed.');
      captureViewerError(error, { area: 'parent_unbind_child' });
    },
  });

  const children = childrenQuery.data ?? [];
  const report = reportQuery.data;

  if (childrenQuery.isLoading) {
    return (
      <PageContainer title={viewerCopy.parent.title} subtitle={viewerCopy.parent.subtitle}>
        <LoadingStateCard />
      </PageContainer>
    );
  }

  if (childrenQuery.error) {
    return (
      <PageContainer title={viewerCopy.parent.title} subtitle={viewerCopy.parent.subtitle}>
        <ErrorStateCard
          message={childrenQuery.error instanceof Error ? childrenQuery.error.message : undefined}
          onRetry={() => void childrenQuery.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={viewerCopy.parent.title} subtitle={viewerCopy.parent.subtitle}>
      <SurfaceCard className="space-y-3">
        <h2 className="text-xl font-black text-[var(--viewer-text)]">Bind learner</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-[var(--viewer-border)] px-4 py-3 outline-none"
            value={bindCodeInput}
            onChange={(event) => setBindCodeInput(event.target.value)}
            placeholder="Bind child with code"
          />
          <button
            type="button"
            className="rounded-2xl bg-[var(--viewer-primary)] px-4 py-3 text-sm font-black text-white"
            onClick={() => bindChildMutation.mutate()}
            disabled={!bindCodeInput.trim() || bindChildMutation.isPending}
          >
            {bindChildMutation.isPending ? 'Binding…' : viewerCopy.parent.bind}
          </button>
        </div>
      </SurfaceCard>

      {bindingStatus ? (
        <SurfaceCard>
          <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">{bindingStatus}</p>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-3">
          {children.length === 0 ? <EmptyStateCard message="No linked learners yet." /> : null}
          {children.map((child) => (
            <button
              key={child.child_id}
              type="button"
              className={
                selectedChildId === child.child_id
                  ? 'w-full rounded-3xl bg-indigo-50 px-4 py-4 text-left'
                  : 'w-full rounded-3xl border border-[var(--viewer-border)] px-4 py-4 text-left'
              }
              onClick={() => setSelectedChildId(child.child_id)}
            >
              <p className="text-sm font-black text-[var(--viewer-text)]">{child.child_name}</p>
              <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">
                {child.lessons_completed} lessons · {child.total_xp} XP
              </p>
            </button>
          ))}
        </SurfaceCard>

        <div className="grid gap-4">
          <SurfaceCard className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[var(--viewer-text)]">Selected child report</h2>
              <button
                type="button"
                className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-black text-rose-700"
                onClick={() => unbindMutation.mutate()}
                disabled={!selectedChildId || unbindMutation.isPending}
              >
                {viewerCopy.parent.unbind}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">Total XP</p>
                <p className="mt-2 text-lg font-black text-[var(--viewer-text)]">{report?.summary.total_xp ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">Streak</p>
                <p className="mt-2 text-lg font-black text-[var(--viewer-text)]">{report?.summary.streak ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">Lessons completed</p>
                <p className="mt-2 text-lg font-black text-[var(--viewer-text)]">{report?.summary.lessons_completed ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">Courses completed</p>
                <p className="mt-2 text-lg font-black text-[var(--viewer-text)]">{report?.summary.courses_completed ?? 0}</p>
              </div>
            </div>
            {reportQuery.error instanceof Error ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {reportQuery.error.message}
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="space-y-3">
            <h2 className="text-xl font-black text-[var(--viewer-text)]">Daily breakdown</h2>
            {reportQuery.isLoading ? <LoadingStateCard message="Loading child report…" /> : null}
            {((report?.daily_breakdown ?? []) as Array<Record<string, unknown>>).map((row) => (
              <div key={String(row.date)} className="flex items-center justify-between rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-3">
                <span className="text-sm font-bold text-[var(--viewer-text)]">{String(row.date)}</span>
                <span className="text-sm font-medium text-[var(--viewer-text-muted)]">
                  {String(row.minutes)} min · {String(row.xp)} XP
                </span>
              </div>
            ))}
          </SurfaceCard>
        </div>
      </div>
    </PageContainer>
  );
}
