import type { Block } from '@primoria/schema';

interface ImagePanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function ImagePanel({ block }: ImagePanelProps) {
  const content = block.content as { url?: string };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Content
      </p>
      <p className="text-sm text-muted-foreground">
        Use the image block on the canvas to upload or replace the asset.
      </p>
      {content.url ? (
        <p className="text-xs text-muted-foreground break-all">{content.url}</p>
      ) : null}
    </div>
  );
}
