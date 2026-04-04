import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { viewerCopy } from '@/shared/theme/copy';

export function LoadingStateCard({ message }: { message?: string }) {
  return (
    <SurfaceCard>
      <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">
        {message ?? viewerCopy.common.loading}
      </p>
    </SurfaceCard>
  );
}

export function EmptyStateCard({ message }: { message?: string }) {
  return (
    <SurfaceCard>
      <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">
        {message ?? viewerCopy.common.empty}
      </p>
    </SurfaceCard>
  );
}

export function ErrorStateCard({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <SurfaceCard className="space-y-3 border-rose-200 bg-rose-50/80">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
          {title ?? viewerCopy.common.errorTitle}
        </p>
        <p className="mt-2 text-sm font-semibold text-rose-900">
          {message ?? viewerCopy.common.errorFallback}
        </p>
      </div>
      {onRetry ? (
        <button
          type="button"
          className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white"
          onClick={onRetry}
        >
          {viewerCopy.common.retry}
        </button>
      ) : null}
    </SurfaceCard>
  );
}

export function FeatureDisabledState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SurfaceCard className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">
          {viewerCopy.common.statusDisabled}
        </p>
        <h2 className="mt-2 text-2xl font-black text-[var(--viewer-text)]">{title}</h2>
        <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">{message}</p>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="rounded-2xl bg-[var(--viewer-primary)] px-4 py-3 text-sm font-black text-white"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </SurfaceCard>
  );
}
