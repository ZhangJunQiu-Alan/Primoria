import { useAppDispatch } from '@/store';
import { updateBlockStyle } from '@/store/editorSlice';
import type { Block } from '@primoria/schema';
import { TextColorControl } from '../TextColorControl';

interface TextPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function TextPanel({ block, lessonId, pageId }: TextPanelProps) {
  const dispatch = useAppDispatch();

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Content
        </p>
        <p className="text-sm text-muted-foreground">
          Double-click the block on the canvas to edit rich text and formatting.
        </p>
      </div>

      <TextColorControl
        value={block.style?.textColor}
        onChange={(textColor) =>
          dispatch(updateBlockStyle({ lessonId, pageId, blockId: block.id, style: { textColor } }))
        }
      />
    </div>
  );
}
