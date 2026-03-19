import { CopyIcon, TrashIcon } from '@radix-ui/react-icons';
import { useAppDispatch } from '@/store';
import { updateBlockSettings, removeBlock, duplicateBlock } from '@/store/editorSlice';
import { nanoid } from '@/lib/nanoid';
import type { Block } from '@primoria/schema';

interface BlockSettingsProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function BlockSettings({ block, lessonId, pageId }: BlockSettingsProps) {
  const dispatch = useAppDispatch();

  function handleVisibilityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    dispatch(
      updateBlockSettings({
        lessonId,
        pageId,
        blockId: block.id,
        visibilityRule: e.target.value as 'always' | 'afterPreviousCorrect',
      }),
    );
  }

  function handleRequiredChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch(
      updateBlockSettings({
        lessonId,
        pageId,
        blockId: block.id,
        requiredForProgress: e.target.checked,
      }),
    );
  }

  return (
    <div className="mt-6 pt-4 border-t space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Block settings
      </p>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground uppercase tracking-wide">
          Visibility
        </label>
        <select
          value={block.visibilityRule ?? 'always'}
          onChange={handleVisibilityChange}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-ring focus:ring-2"
        >
          <option value="always">Always visible</option>
          <option value="afterPreviousCorrect">After previous correct</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={block.requiredForProgress ?? false}
          onChange={handleRequiredChange}
          className="h-4 w-4"
        />
        Required for progress
      </label>

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
