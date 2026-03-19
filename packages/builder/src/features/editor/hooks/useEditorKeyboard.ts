import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { undo, redo, removeBlock, duplicateBlock } from '@/store/editorSlice';
import { nanoid } from '@/lib/nanoid';

interface UseEditorKeyboardOptions {
  lessonId: string | null;
  pageId: string | null;
  onSave: () => void;
}

/**
 * Global keyboard shortcuts for the editor canvas.
 *
 * Cmd/Ctrl+Z       → undo
 * Cmd/Ctrl+Shift+Z → redo
 * Cmd/Ctrl+Y       → redo (Windows alt)
 * Cmd/Ctrl+S       → save
 * Cmd/Ctrl+D       → duplicate selected block
 * Delete/Backspace → delete selected block (only when canvas is focused, not an input)
 */
export function useEditorKeyboard({ lessonId, pageId, onSave }: UseEditorKeyboardOptions) {
  const dispatch = useAppDispatch();
  const selectedBlockId = useAppSelector((s) => s.editor.selectedBlockId);
  const canUndo = useAppSelector((s) => s.editor.past.length > 0);
  const canRedo = useAppSelector((s) => s.editor.future.length > 0);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Undo
      if (meta && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canUndo) dispatch(undo());
        return;
      }

      // Redo
      if ((meta && e.shiftKey && e.key === 'z') || (meta && e.key === 'y')) {
        e.preventDefault();
        if (canRedo) dispatch(redo());
        return;
      }

      // Save
      if (meta && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      // Below shortcuts only apply when NOT inside an input
      if (inInput) return;

      // Duplicate
      if (meta && e.key === 'd') {
        e.preventDefault();
        if (selectedBlockId && lessonId && pageId) {
          dispatch(
            duplicateBlock({
              lessonId,
              pageId,
              blockId: selectedBlockId,
              newId: nanoid(),
            }),
          );
        }
        return;
      }

      // Delete selected block
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId && lessonId && pageId) {
        dispatch(removeBlock({ lessonId, pageId, blockId: selectedBlockId }));
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, selectedBlockId, lessonId, pageId, canUndo, canRedo, onSave]);
}
