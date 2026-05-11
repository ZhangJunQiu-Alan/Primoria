import type {
  InteractiveVisualRendererProps,
  TrustedInteractiveVisualEngine,
} from '@/shared/interactive-visual/interactiveVisualRendererTypes';

const TRUSTED_RENDERER_COPY: Record<TrustedInteractiveVisualEngine, { label: string; description: string }> = {
  'r3f-cell-3d': {
    label: '3D cell renderer',
    description: 'A trusted React Three Fiber renderer can mount here without executing AI-generated app code.',
  },
  'physics-canvas': {
    label: 'Physics canvas renderer',
    description: 'A trusted canvas simulation renderer can mount here with a typed runtime config.',
  },
};

export function createTrustedInteractiveVisualPlaceholder(engine: TrustedInteractiveVisualEngine) {
  const copy = TRUSTED_RENDERER_COPY[engine];

  return function TrustedInteractiveVisualPlaceholder({ title, description }: InteractiveVisualRendererProps) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">
          {copy.label}
        </p>
        <h3 className="mt-2 text-lg font-black text-[var(--viewer-text)]">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">{description}</p>
        ) : null}
        <p className="mt-4 text-sm font-medium text-[var(--viewer-text-muted)]">{copy.description}</p>
      </div>
    );
  };
}
