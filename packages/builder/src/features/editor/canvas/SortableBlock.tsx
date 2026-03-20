import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CopyIcon, DragHandleDots2Icon, TrashIcon } from '@radix-ui/react-icons';
import { type Block } from '@primoria/schema';
import { BlockPreview } from './BlockPreview';
import { cn } from '@/lib/utils';

interface SortableBlockProps {
  block: Block;
  lessonId: string;
  pageId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function SortableBlock({
  block,
  lessonId,
  pageId,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: SortableBlockProps) {
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
      className={cn('editor-sortable-block group relative', isDragging && 'opacity-50')}
    >
      <div className="editor-sortable-block__actions">
        <button
          {...attributes}
          {...listeners}
          className="editor-sortable-block__action cursor-grab active:cursor-grabbing"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <DragHandleDots2Icon className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="editor-sortable-block__action"
          aria-label="Duplicate block"
        >
          <CopyIcon className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="editor-sortable-block__action editor-sortable-block__action--danger"
          aria-label="Delete block"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="min-w-0">
        <BlockPreview
          block={block}
          lessonId={lessonId}
          pageId={pageId}
          isSelected={isSelected}
          onClick={onSelect}
        />
      </div>
    </div>
  );
}
