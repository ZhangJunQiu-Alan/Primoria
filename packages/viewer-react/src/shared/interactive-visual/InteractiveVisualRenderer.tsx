import { HtmlIframeInteractiveVisualRenderer } from '@/shared/interactive-visual/HtmlIframeInteractiveVisualRenderer';
import { PhysicsCanvasWaveRenderer } from '@/shared/interactive-visual/PhysicsCanvasWaveRenderer';
import { createTrustedInteractiveVisualPlaceholder } from '@/shared/interactive-visual/TrustedInteractiveVisualPlaceholders';
import {
  DEFAULT_INTERACTIVE_VISUAL_ENGINE,
  resolveInteractiveVisualEngine,
  type InteractiveVisualContent,
  type InteractiveVisualEngine,
  type InteractiveVisualRenderer,
} from '@/shared/interactive-visual/interactiveVisualRendererTypes';

const INTERACTIVE_VISUAL_RENDERERS: Record<InteractiveVisualEngine, InteractiveVisualRenderer> = {
  [DEFAULT_INTERACTIVE_VISUAL_ENGINE]: HtmlIframeInteractiveVisualRenderer,
  'r3f-cell-3d': createTrustedInteractiveVisualPlaceholder('r3f-cell-3d'),
  'physics-canvas': PhysicsCanvasWaveRenderer,
};

export function InteractiveVisualRendererView({
  content,
  frameClassName,
}: {
  content: InteractiveVisualContent;
  frameClassName?: string;
}) {
  const title = typeof content.title === 'string' && content.title.trim() ? content.title : 'Interactive Visual';
  const description =
    typeof content.description === 'string' && content.description.trim() ? content.description : undefined;
  const engine = resolveInteractiveVisualEngine(content);

  if (!engine) {
    return <UnsupportedInteractiveVisualEngine title={title} engine={String(content.engine ?? 'unknown')} />;
  }

  const Renderer = INTERACTIVE_VISUAL_RENDERERS[engine];
  return <Renderer content={content} title={title} description={description} frameClassName={frameClassName} />;
}

function UnsupportedInteractiveVisualEngine({ title, engine }: { title: string; engine: string }) {
  return (
    <div className="rounded-3xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-6 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">
        Unsupported visual renderer
      </p>
      <h3 className="mt-2 text-lg font-black text-[var(--viewer-text)]">{title}</h3>
      <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">
        The renderer engine "{engine}" is not available in this version.
      </p>
    </div>
  );
}
