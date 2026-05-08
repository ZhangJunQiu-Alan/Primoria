import { CopyIcon, TrashIcon } from '@radix-ui/react-icons';
import { useAppDispatch } from '@/store';
import { removeBlock, duplicateBlock } from '@/store/editorSlice';
import { nanoid } from '@/lib/nanoid';
import type { Block } from '@primoria/schema';

interface BlockSettingsProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function BlockSettings({ block, lessonId, pageId }: BlockSettingsProps) {
  const dispatch = useAppDispatch();

  return (
    <div className="mt-6 pt-4 border-t space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Block settings
      </p>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() =>
            dispatch(duplicateBlock({ lessonId, pageId, blockId: block.id, newId: nanoid() }))
          }
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors flex-1 justify-center"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          Duplicate
        </button>
        <button
          onClick={() => dispatch(removeBlock({ lessonId, pageId, blockId: block.id }))}
          className="flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors flex-1 justify-center"
        >
          <TrashIcon className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
