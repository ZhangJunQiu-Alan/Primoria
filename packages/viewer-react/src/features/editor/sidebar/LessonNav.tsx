import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon,
  Pencil1Icon,
  CheckIcon,
  TrashIcon,
  DragHandleDots2Icon,
} from '@radix-ui/react-icons';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  addLesson,
  removeLesson,
  updateLessonTitle,
  reorderLessons,
  addPage,
  removePage,
} from '@/store/editorSlice';
import { nanoid } from '@/lib/nanoid';
import { uuid } from '@/lib/uuid';
import { cn } from '@/lib/utils';

interface LessonNavProps {
  selectedLessonId: string | null;
  selectedPageId: string | null;
  onSelectLesson: (lessonId: string, pageId: string) => void;
}

export function LessonNav({ selectedLessonId, selectedPageId, onSelectLesson }: LessonNavProps) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.editor.draft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!draft) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = draft!.lessons.map((l) => l.lesson_id);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = [...ids];
    reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, String(active.id));
    dispatch(reorderLessons(reordered));
  }

  function handleAddLesson() {
    const lessonId = uuid();
    const pageId = nanoid();
    dispatch(addLesson({ lessonId, pageId }));
    onSelectLesson(lessonId, pageId);
  }

  function commitEdit(lessonId: string) {
    if (editTitle.trim()) {
      dispatch(updateLessonTitle({ lessonId, title: editTitle.trim() }));
    }
    setEditingId(null);
  }

  function handleDeleteLesson(lessonId: string) {
    if (draft!.lessons.length <= 1) return; // keep at least one
    dispatch(removeLesson(lessonId));
    if (selectedLessonId === lessonId) {
      const remaining = draft!.lessons.find((l) => l.lesson_id !== lessonId);
      const firstPage = remaining?.pages[0];
      if (remaining && firstPage) onSelectLesson(remaining.lesson_id, firstPage.page_id);
    }
  }

  function handleAddPage(lessonId: string) {
    const pageId = nanoid();
    dispatch(addPage({ lessonId, pageId }));
    onSelectLesson(lessonId, pageId);
  }

  return (
    <div className="h-full overflow-y-auto border-r bg-muted/30 flex flex-col">
      <div className="px-3 py-3 flex items-center justify-between border-b shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Lessons
        </span>
        <button
          onClick={handleAddLesson}
          className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Add lesson"
          aria-label="Add lesson"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={draft.lessons.map((l) => l.lesson_id)}
            strategy={verticalListSortingStrategy}
          >
            {draft.lessons.map((lesson, li) => (
              <SortableLessonRow
                key={lesson.lesson_id}
                lessonId={lesson.lesson_id}
                lessonIndex={li}
                title={lesson.title}
                pages={lesson.pages}
                isExpanded={selectedLessonId === lesson.lesson_id}
                selectedPageId={selectedPageId}
                isEditing={editingId === lesson.lesson_id}
                editTitle={editTitle}
                canDelete={draft.lessons.length > 1}
                onSelect={(pageId) => onSelectLesson(lesson.lesson_id, pageId)}
                onStartEdit={() => {
                  setEditingId(lesson.lesson_id);
                  setEditTitle(lesson.title);
                }}
                onEditChange={setEditTitle}
                onCommitEdit={() => commitEdit(lesson.lesson_id)}
                onDelete={() => handleDeleteLesson(lesson.lesson_id)}
                onAddPage={() => handleAddPage(lesson.lesson_id)}
                onRemovePage={(pageId) =>
                  dispatch(removePage({ lessonId: lesson.lesson_id, pageId }))
                }
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// ─── Sortable lesson row ───────────────────────────────────────────────────────

interface SortableLessonRowProps {
  lessonId: string;
  lessonIndex: number;
  title: string;
  pages: Array<{ page_id: string; order: number }>;
  isExpanded: boolean;
  selectedPageId: string | null;
  isEditing: boolean;
  editTitle: string;
  canDelete: boolean;
  onSelect: (pageId: string) => void;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onCommitEdit: () => void;
  onDelete: () => void;
  onAddPage: () => void;
  onRemovePage: (pageId: string) => void;
}

function SortableLessonRow({
  lessonId,
  lessonIndex,
  title,
  pages,
  isExpanded,
  selectedPageId,
  isEditing,
  editTitle,
  canDelete,
  onSelect,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onDelete,
  onAddPage,
  onRemovePage,
}: SortableLessonRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lessonId,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn('group', isDragging && 'opacity-50')}>
      {/* Lesson header */}
      <div
        className={cn(
          'flex items-center gap-1 rounded-md px-1 py-1.5 cursor-pointer',
          'hover:bg-accent transition-colors',
          isExpanded && 'bg-accent',
        )}
        onClick={() => onSelect(pages[0]!.page_id)}
      >
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <DragHandleDots2Icon className="h-3.5 w-3.5" />
        </button>

        <span className="text-xs text-muted-foreground w-4 shrink-0 text-center">
          {lessonIndex + 1}
        </span>

        {isEditing ? (
          <>
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommitEdit();
                if (e.key === 'Escape') onCommitEdit();
              }}
              className="flex-1 text-xs bg-transparent outline-none border-b border-primary min-w-0"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Lesson title for ${title}`}
            />
            <button
              onClick={(e) => { e.stopPropagation(); onCommitEdit(); }}
              className="shrink-0 text-primary p-0.5"
              aria-label={`Save lesson title for ${title}`}
            >
              <CheckIcon className="h-3 w-3" />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm truncate min-w-0">{title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
              className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-background transition-all"
              aria-label={`Edit lesson ${title}`}
            >
              <Pencil1Icon className="h-3 w-3 text-muted-foreground" />
            </button>
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-destructive transition-all"
                aria-label={`Delete lesson ${title}`}
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Pages — only shown when lesson is expanded and has >1 page */}
      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {pages.map((page, pi) => (
            <div key={page.page_id} className="group/page flex items-center gap-1">
              <button
                onClick={() => onSelect(page.page_id)}
                className={cn(
                  'flex-1 text-left rounded px-2 py-1 text-xs transition-colors',
                  selectedPageId === page.page_id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                Page {pi + 1}
              </button>
              {pages.length > 1 && (
                <button
                  onClick={() => onRemovePage(page.page_id)}
                  className="opacity-0 group-hover/page:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-destructive transition-all"
                  aria-label={`Delete page ${pi + 1}`}
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={onAddPage}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            aria-label="Add page"
          >
            <PlusIcon className="h-3 w-3" /> Add page
          </button>
        </div>
      )}
    </div>
  );
}
