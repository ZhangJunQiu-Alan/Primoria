import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  DownloadIcon,
  EyeOpenIcon,
  EyeClosedIcon,
} from '@radix-ui/react-icons';
import { Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppSelector, useAppDispatch } from '@/store';
import { togglePreview } from '@/store/editorSlice';
import { AccountMenu } from '@/components/account/AccountMenu';
import { useSaveCourse } from './hooks/useSaveCourse';
import { usePublish } from './hooks/usePublish';
import { useEditorKeyboard } from './hooks/useEditorKeyboard';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
  activeLessonId: string | null;
  activePageId: string | null;
  activeLessonTitle: string | null;
}

export function EditorHeader({
  activeLessonId,
  activePageId,
  activeLessonTitle,
}: EditorHeaderProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.editor.draft);
  const user = useAppSelector((s) => s.auth.user);
  const isDirty = useAppSelector((s) => s.editor.isDirty);
  const isSaving = useAppSelector((s) => s.editor.isSaving);
  const previewMode = useAppSelector((s) => s.editor.previewMode);

  const [actionError, setActionError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const { saveCourse } = useSaveCourse();

  const { publish, publishing } = usePublish(saveCourse);

  useEditorKeyboard({
    lessonId: activeLessonId,
    pageId: activePageId,
    onSave: () => void handleSave(),
  });

  function getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    return 'Action failed. Please try again.';
  }

  async function handleSave() {
    setActionError(null);
    setPublishSuccess(false);

    try {
      await saveCourse();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handlePublish() {
    setActionError(null);
    setPublishSuccess(false);
    const result = await publish();
    if (result.success) {
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3000);
    } else if (result.validationErrors) {
      const issues = result.validationErrors.issues
        .slice(0, 2)
        .map((issue) => issue.message)
        .join(' · ');
      setActionError(`Validation failed: ${issues}`);
    } else {
      setActionError(result.serverError ?? 'Unknown error');
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

  const avatarInitial = (user?.email ?? draft?.metadata.title ?? 'P').charAt(0).toUpperCase();
  const lessonLabel = activeLessonTitle ?? 'Untitled lesson';

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  function confirmLeaveWorkspace() {
    if (!isDirty) {
      return true;
    }

    return window.confirm('You have unsaved changes. Leave the editor anyway?');
  }

  return (
    <header className="editor-topbar">
      <button
        type="button"
        onClick={() => {
          if (!confirmLeaveWorkspace()) {
            return;
          }
          navigate('/builder/dashboard');
        }}
        className="editor-topbar__brand"
        aria-label="Back to dashboard"
      >
        <span className="editor-topbar__brand-mark">
          <img src="/primoria-logo.png" alt="" />
        </span>
        <span className="editor-topbar__brand-copy">
          <strong>{draft?.metadata.title ?? 'Untitled Course'}</strong>
          <span>{lessonLabel}</span>
        </span>
      </button>

      <div className="editor-topbar__actions">
        <span
          className={cn(
            'editor-toolbar-status',
            isSaving ? 'is-saving' : isDirty ? 'is-dirty' : 'is-clean',
          )}
        >
          {isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : 'Saved'}
        </span>

        {actionError && (
          <span className="editor-toolbar-feedback editor-toolbar-feedback--error" title={actionError}>
            {actionError}
          </span>
        )}

        {publishSuccess && (
          <span className="editor-toolbar-feedback editor-toolbar-feedback--success">
            <CheckIcon className="h-3.5 w-3.5" />
            Published
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            if (!confirmLeaveWorkspace()) {
              return;
            }
            navigate('/home');
          }}
          className="editor-toolbar-button editor-toolbar-button--ghost"
          title="Return to viewer"
        >
          <Home className="h-4 w-4" />
          Viewer
        </button>

        <button
          type="button"
          onClick={() => dispatch(togglePreview())}
          title={previewMode ? 'Exit preview (learner view)' : 'Preview (learner view)'}
          className={cn(
            'editor-toolbar-button editor-toolbar-button--ghost',
            previewMode && 'is-active',
          )}
        >
          {previewMode ? <EyeClosedIcon className="h-4 w-4" /> : <EyeOpenIcon className="h-4 w-4" />}
          {previewMode ? 'Exit preview' : 'Preview'}
        </button>

        <button
          type="button"
          onClick={handleExport}
          title="Export course as JSON"
          className="editor-toolbar-button editor-toolbar-button--secondary"
        >
          <DownloadIcon className="h-4 w-4" />
          Export
        </button>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || isSaving}
          title="Save (⌘S)"
          className="editor-toolbar-button editor-toolbar-button--secondary"
        >
          Save
        </button>

        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={publishing || isSaving}
          className="editor-toolbar-button editor-toolbar-button--primary"
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </button>

        {user ? (
          <AccountMenu
            buttonClassName="editor-avatar-button"
            imageClassName="editor-avatar-button__image"
            onSignOut={handleSignOut}
            sideOffset={8}
            title={user.email ?? 'Author account'}
            user={user}
          />
        ) : (
          <button type="button" className="editor-avatar-button" title="Author account">
            {avatarInitial}
          </button>
        )}
      </div>
    </header>
  );
}
