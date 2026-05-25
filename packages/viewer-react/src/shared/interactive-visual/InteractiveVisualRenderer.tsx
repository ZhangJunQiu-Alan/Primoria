import { HtmlIframeInteractiveVisualRenderer } from '@/shared/interactive-visual/HtmlIframeInteractiveVisualRenderer';
import type { InteractiveVisualContent } from '@/shared/interactive-visual/interactiveVisualRendererTypes';

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

  return (
    <HtmlIframeInteractiveVisualRenderer
      content={content}
      title={title}
      description={description}
      frameClassName={frameClassName}
    />
  );
}
