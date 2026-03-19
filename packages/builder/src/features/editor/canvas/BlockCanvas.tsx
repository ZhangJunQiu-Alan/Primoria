import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { nanoid } from '../../../lib/nanoid';
import { useAppDispatch, useAppSelector } from '@/store';
import { addBlock, removeBlock, reorderBlocks, selectBlock, duplicateBlock } from '@/store/editorSlice';
import { BLOCK_META } from '../blockRegistry';
import { SortableBlock } from './SortableBlock';
import { AddBlockMenu } from './AddBlockMenu';
import type { BlockType } from '@primoria/schema';

interface BlockCanvasProps {
  lessonId: string;
  pageId: string;
}

export function BlockCanvas({ lessonId, pageId }: BlockCanvasProps) {
  const dispatch = useAppDispatch();
  const selectedBlockId = useAppSelector((s) => s.editor.selectedBlockId);
  const draft = useAppSelector((s) => s.editor.draft);

  const lesson = draft?.lessons.find((l) => l.lesson_id === lessonId);
  const page = lesson?.pages.find((p) => p.page_id === pageId);
  const blocks = page?.blocks ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...blocks.map((b) => b.id)];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, String(active.id));

    dispatch(reorderBlocks({ lessonId, pageId, orderedIds: newOrder }));
  }

  const handleAdd = useCallback(
    (type: BlockType) => {
      const meta = BLOCK_META[type];
      dispatch(
        addBlock({
          lessonId,
          pageId,
          block: {
            id: nanoid(),
            type,
            position: { order: blocks.length },
            content: meta.defaultContent,
          },
        }),
      );
    },
    [dispatch, lessonId, pageId, blocks.length],
  );

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a lesson to start editing
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-2xl space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={() => dispatch(selectBlock(block.id))}
                onDelete={() => dispatch(removeBlock({ lessonId, pageId, blockId: block.id }))}
                onDuplicate={() =>
                  dispatch(duplicateBlock({ lessonId, pageId, blockId: block.id, newId: nanoid() }))
                }
              />
            ))}
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            This page is empty. Add your first block below.
          </div>
        )}

        <AddBlockMenu onAdd={handleAdd} />
      </div>
    </div>
  );
}
