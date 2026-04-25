import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { useCoreCopy } from '@/shared/theme/coreCopy';

export function LoadingStateCard({ message }: { message?: string }) {
  const copy = useCoreCopy();

  return (
    <SurfaceCard>
      <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">
        {message ?? copy.common.loading}
      </p>
    </SurfaceCard>
  );
}

export function EmptyStateCard({ message }: { message?: string }) {
  const copy = useCoreCopy();

  return (
    <SurfaceCard>
      <p className="text-sm font-semibold text-[var(--viewer-text-muted)]">
        {message ?? copy.common.empty}
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
  const copy = useCoreCopy();

  return (
    <SurfaceCard className="space-y-3 border-[#e6c8c2] bg-[#fbefed]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a15c54]">
          {title ?? copy.common.errorTitle}
        </p>
        <p className="mt-2 text-sm font-semibold text-[#5f403c]">
          {message ?? copy.common.errorFallback}
        </p>
      </div>
      {onRetry ? (
        <button
          type="button"
          className="viewer-botanical-button viewer-botanical-button--warm"
          onClick={onRetry}
        >
          {copy.common.retry}
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
  const copy = useCoreCopy();

  return (
    <SurfaceCard className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">
          {copy.common.statusDisabled}
        </p>
        <h2 className="mt-2 text-2xl font-black text-[var(--viewer-text)]">{title}</h2>
        <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">{message}</p>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="viewer-botanical-button viewer-botanical-button--primary"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </SurfaceCard>
  );
}
