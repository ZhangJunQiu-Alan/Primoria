import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CopyIcon, Cross1Icon, DragHandleDots2Icon, TrashIcon } from '@radix-ui/react-icons';
import { Eye, EyeOff } from 'lucide-react';
import { type Block } from '@primoria/schema';
import { BlockPreview } from './BlockPreview';
import { cn } from '@/lib/utils';
import { getBlockVisibilityRule } from '../blockVisibility';

interface SortableBlockProps {
  block: Block;
  lessonId: string;
  pageId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClearMedia?: () => void;
  onToggleVisibility: () => void;
}

export function SortableBlock({
  block,
  lessonId,
  pageId,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onClearMedia,
  onToggleVisibility,
}: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const imageContent = block.type === 'image' ? (block.content as { url?: string }) : null;
  const videoContent = block.type === 'video' ? (block.content as { url?: string }) : null;
  const canClearMedia = Boolean(imageContent?.url || videoContent?.url);
  const isHidden = getBlockVisibilityRule(block) === 'hidden';

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
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className={cn(
            'editor-sortable-block__action',
            isHidden && 'editor-sortable-block__action--muted',
          )}
          aria-label={isHidden ? 'Show block in published course' : 'Hide block in published course'}
          aria-pressed={!isHidden}
          title={isHidden ? 'Hidden in published course' : 'Visible in published course'}
        >
          {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {canClearMedia && onClearMedia ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearMedia();
            }}
            className="editor-sortable-block__action editor-sortable-block__action--danger"
            aria-label={block.type === 'video' ? 'Remove video' : 'Remove image'}
            title={block.type === 'video' ? 'Remove video' : 'Remove image'}
          >
            <Cross1Icon className="h-4 w-4" />
          </button>
        ) : null}
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
