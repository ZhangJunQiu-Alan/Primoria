import type { Block } from '@primoria/schema';

interface TextPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function TextPanel(_: TextPanelProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Content
      </p>
      <p className="text-sm text-muted-foreground">
        Double-click the block on the canvas to edit rich text and formatting.
      </p>
    </div>
  );
}
