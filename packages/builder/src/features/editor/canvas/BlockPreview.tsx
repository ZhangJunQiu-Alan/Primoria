import { type Block } from '@primoria/schema';
import { BLOCK_META } from '../blockRegistry';
import { VISIBILITY_LABELS, getBlockVisibilityRule } from '../blockVisibility';
import { EditableBlockCanvasContent } from './EditableBlockCanvasContent';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface BlockPreviewProps {
  block: Block;
  lessonId: string;
  pageId: string;
  isSelected: boolean;
  onClick: () => void;
}

const INLINE_EDITABLE_TYPES = new Set(['text', 'code-block', 'code-playground']);

export function BlockPreview({
  block,
  lessonId,
  pageId,
  isSelected,
  onClick,
}: BlockPreviewProps) {
  const meta = BLOCK_META[block.type];
  const visibilityRule = getBlockVisibilityRule(block);
  const tagTone =
    visibilityRule === 'afterPreviousCorrect' ? 'editor-block-card__tag--gated' : 'editor-block-card__tag--always';
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  const canInlineEdit = INLINE_EDITABLE_TYPES.has(block.type);

  return (
    <div
      onClick={onClick}
      onDoubleClick={() => {
        onClick();
        if (canInlineEdit) {
          setIsEditing(true);
        }
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        'editor-block-card w-full text-left transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        isEditing && 'editor-block-card--editing',
        isSelected
          ? 'editor-block-card--selected border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
          : 'border-border bg-card',
      )}
    >
      <div className="editor-block-card__header">
        <div className="editor-block-card__identity">
          <span className="editor-block-card__mark" aria-hidden>
            {meta.icon}
          </span>
          <div className="editor-block-card__copy">
            <div className="editor-block-card__label">{meta.label}</div>
          </div>
        </div>
        <span className={cn('editor-block-card__tag', tagTone)}>
          {VISIBILITY_LABELS[visibilityRule]}
        </span>
      </div>

      <div className="editor-block-card__body">
        <EditableBlockCanvasContent
          block={block}
          lessonId={lessonId}
          pageId={pageId}
          isSelected={isSelected}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
}
