import { InteractiveVisualEmbed } from '@/shared/interactive-visual/InteractiveVisualEmbed';
import {
  getInteractiveVisualHtml,
  type InteractiveVisualRendererProps,
} from '@/shared/interactive-visual/interactiveVisualRendererTypes';

export function HtmlIframeInteractiveVisualRenderer({
  content,
  title,
  description,
  frameClassName,
}: InteractiveVisualRendererProps) {
  const html = getInteractiveVisualHtml(content);

  if (!html) {
    return <InteractiveVisualEmptyState title={title} />;
  }

  return (
    <InteractiveVisualEmbed
      title={title}
      description={description}
      generatedHtml={html}
      frameClassName={frameClassName}
    />
  );
}

export function InteractiveVisualEmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-6 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">
        Interactive visual
      </p>
      <h3 className="mt-2 text-lg font-black text-[var(--viewer-text)]">{title}</h3>
      <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">
        Generate or paste HTML to display this interactive visual.
      </p>
    </div>
  );
}
