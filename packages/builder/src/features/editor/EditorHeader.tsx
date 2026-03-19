import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  ChevronLeftIcon,
  DownloadIcon,
  EyeOpenIcon,
  EyeClosedIcon,
  ResetIcon,
} from '@radix-ui/react-icons';
import { useAppSelector, useAppDispatch } from '@/store';
import { undo, redo, togglePreview } from '@/store/editorSlice';
import { useAutoSave } from './hooks/useAutoSave';
import { usePublish } from './hooks/usePublish';
import { useEditorKeyboard } from './hooks/useEditorKeyboard';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
  activeLessonId: string | null;
  activePageId: string | null;
}

export function EditorHeader({ activeLessonId, activePageId }: EditorHeaderProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.editor.draft);
  const isDirty = useAppSelector((s) => s.editor.isDirty);
  const isSaving = useAppSelector((s) => s.editor.isSaving);
  const canUndo = useAppSelector((s) => s.editor.past.length > 0);
  const canRedo = useAppSelector((s) => s.editor.future.length > 0);
  const previewMode = useAppSelector((s) => s.editor.previewMode);

  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const { forceSave } = useAutoSave({
    onRemoteError: (err) => console.error('Auto-save failed:', err),
  });

  const { publish, publishing } = usePublish(forceSave);

  // Wire keyboard shortcuts
  useEditorKeyboard({
    lessonId: activeLessonId,
    pageId: activePageId,
    onSave: () => void forceSave(),
  });

  async function handlePublish() {
    setPublishError(null);
    setPublishSuccess(false);
    const result = await publish();
    if (result.success) {
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3000);
    } else if (result.validationErrors) {
      const issues = result.validationErrors.issues
        .slice(0, 2)
        .map((i) => i.message)
        .join(' · ');
      setPublishError(`Validation failed: ${issues}`);
    } else {
      setPublishError(result.serverError ?? 'Unknown error');
    }
  }

  function handleExport() {
    if (!draft) return;
    const json = JSON.stringify(draft, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.metadata.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="h-14 border-b flex items-center gap-2 px-4 shrink-0">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      <div className="w-px h-5 bg-border" />

      {/* Undo / Redo */}
      <button
        onClick={() => dispatch(undo())}
        disabled={!canUndo}
        title="Undo (⌘Z)"
        className="p-1.5 rounded hover:bg-accent disabled:opacity-30 transition-colors"
      >
        <ResetIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => dispatch(redo())}
        disabled={!canRedo}
        title="Redo (⌘⇧Z)"
        className="p-1.5 rounded hover:bg-accent disabled:opacity-30 transition-colors scale-x-[-1]"
      >
        <ResetIcon className="h-4 w-4" />
      </button>

      <div className="w-px h-5 bg-border" />

      {/* Course title */}
      <span className="font-semibold truncate max-w-[200px] text-sm">
        {draft?.metadata.title ?? 'Untitled'}
      </span>

      {/* Save status */}
      <span
        className={cn(
          'text-xs transition-colors',
          isSaving
            ? 'text-muted-foreground'
            : isDirty
            ? 'text-amber-500'
            : 'text-green-600',
        )}
      >
        {isSaving ? 'Saving…' : isDirty ? 'Unsaved' : 'Saved'}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {publishError && (
          <span className="text-xs text-destructive max-w-[200px] truncate" title={publishError}>
            {publishError}
          </span>
        )}
        {publishSuccess && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckIcon className="h-3.5 w-3.5" /> Published
          </span>
        )}

        {/* Preview toggle */}
        <button
          onClick={() => dispatch(togglePreview())}
          title={previewMode ? 'Exit preview (learner view)' : 'Preview (learner view)'}
          className={cn(
            'p-1.5 rounded border transition-colors',
            previewMode
              ? 'border-primary bg-primary/10 text-primary'
              : 'hover:bg-accent',
          )}
        >
          {previewMode ? <EyeClosedIcon className="h-4 w-4" /> : <EyeOpenIcon className="h-4 w-4" />}
        </button>

        {/* Export JSON */}
        <button
          onClick={handleExport}
          title="Export course as JSON"
          className="p-1.5 rounded border hover:bg-accent transition-colors"
        >
          <DownloadIcon className="h-4 w-4" />
        </button>

        {/* Save */}
        <button
          onClick={() => void forceSave()}
          disabled={!isDirty || isSaving}
          title="Save (⌘S)"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40 transition-colors"
        >
          Save
        </button>

        {/* Publish */}
        <button
          onClick={() => void handlePublish()}
          disabled={publishing || isSaving}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </header>
  );
}
