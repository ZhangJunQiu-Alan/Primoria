import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CopyIcon, DragHandleDots2Icon, TrashIcon } from '@radix-ui/react-icons';
import { type Block } from '@primoria/schema';
import { BlockPreview } from './BlockPreview';
import { cn } from '@/lib/utils';

interface SortableBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function SortableBlock({ block, isSelected, onSelect, onDelete, onDuplicate }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group relative flex items-start gap-2', isDragging && 'opacity-50')}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-3 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent transition-all cursor-grab active:cursor-grabbing"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <DragHandleDots2Icon className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <BlockPreview block={block} isSelected={isSelected} onClick={onSelect} />
      </div>

      {/* Duplicate */}
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="mt-3 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent transition-all"
        aria-label="Duplicate block"
      >
        <CopyIcon className="h-4 w-4" />
      </button>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="mt-3 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
        aria-label="Delete block"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
