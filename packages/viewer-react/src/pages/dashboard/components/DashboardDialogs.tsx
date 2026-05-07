import { useEffect, useState, type FormEvent } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { Bot, BrainCircuit, ChevronDown, Image as ImageIcon, Loader2, X } from 'lucide-react';
import type { CourseRow } from '@/queries/courses';
import {
  buildAICourseDraftPreview,
  courseToFormState,
  emptyAICourseDraftForm,
  parseCourseForm,
} from '@/pages/dashboard/dashboardLib';
import type {
  AICourseDraftFormState,
  AICourseDraftPreview,
  AICourseDraftPace,
  CourseFormPayload,
  CourseFormState,
} from '@/pages/dashboard/dashboardTypes';

export function CourseFormDialog({
  open,
  mode,
  course,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  course?: CourseRow | null;
  pending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CourseFormPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<CourseFormState>(() => courseToFormState(course));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(courseToFormState(course));
    setValidationError(null);
  }, [open, course]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseCourseForm(form);
    if (result.error) {
      setValidationError(result.error);
      return;
    }

    if (!result.payload) return;
    setValidationError(null);
    await onSubmit(result.payload);
  }

  const title = mode === 'create' ? 'Create course' : 'Edit course details';
  const description = mode === 'create'
    ? 'Create the course shell first, then continue refining it in the editor.'
    : 'Adjust the course title, description, cover, and pricing directly from the workspace.';
  const formError = validationError ?? error;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dashboard-dialog__overlay" />
        <Dialog.Content className="dashboard-dialog dashboard-dialog--course-form">
          <div className="dashboard-dialog__topline">
            <div>
              <Dialog.Title className="dashboard-dialog__title">{title}</Dialog.Title>
              <Dialog.Description className="dashboard-dialog__subtitle">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="studio-icon-button studio-icon-button--plain"
                aria-label="Close dialog"
                disabled={pending}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form className="dashboard-dialog__form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="dashboard-field">
              <span>Course title</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="For example: Motion Design Foundations"
                autoFocus
              />
            </label>

            <label className="dashboard-field">
              <span>Course description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={4}
                placeholder="Briefly explain the course goals and learning outcomes."
              />
            </label>

            <div className="dashboard-dialog__grid">
              <label className="dashboard-field">
                <span>Difficulty</span>
                <div className="dashboard-select">
                  <select
                    value={form.difficultyLevel}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        difficultyLevel: event.target.value as CourseFormState['difficultyLevel'],
                      }))
                    }
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </label>

              <label className="dashboard-field">
                <span>Estimated duration (hours)</span>
                <input
                  value={form.estimatedHours}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, estimatedHours: event.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="For example: 2.5"
                />
              </label>
            </div>

            <div className="dashboard-dialog__grid">
              <label className="dashboard-field">
                <span>Pricing</span>
                <div className="dashboard-select">
                  <select
                    value={form.priceTier}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priceTier: event.target.value as CourseFormState['priceTier'],
                      }))
                    }
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </label>

              <label className="dashboard-field">
                <span>Price</span>
                <input
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="For example: 9.99"
                  disabled={form.priceTier !== 'premium'}
                />
              </label>
            </div>

            <label className="dashboard-field">
              <span>Cover image URL</span>
              <input
                value={form.thumbnailUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </label>

            <div className="dashboard-dialog__media-preview">
              {form.thumbnailUrl ? (
                <img src={form.thumbnailUrl} alt="" />
              ) : (
                <div className="dashboard-dialog__media-placeholder">
                  <ImageIcon size={18} />
                  <span>Cover preview</span>
                </div>
              )}
            </div>

            {formError ? <p className="dashboard-form-error">{formError}</p> : null}

            <div className="dashboard-dialog__actions">
              <Dialog.Close asChild>
                <button type="button" className="studio-button studio-button--ghost" disabled={pending}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className={[
                  'studio-button',
                  'studio-button--primary',
                  mode === 'create' ? 'dashboard-dialog__submit--create' : null,
                ].filter(Boolean).join(' ')}
                disabled={pending}
              >
                {pending ? <Loader2 className="dashboard-spin" size={16} /> : null}
                <span>{mode === 'create' ? 'Create course' : 'Save changes'}</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AICourseDraftDialog({
  open,
  onOpenChange,
  onUseDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseDraft: (preview: AICourseDraftPreview) => void;
}) {
  const [form, setForm] = useState<AICourseDraftFormState>(emptyAICourseDraftForm);

  useEffect(() => {
    if (!open) return;
    setForm(emptyAICourseDraftForm);
  }, [open]);

  const preview = buildAICourseDraftPreview(form);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dashboard-dialog__overlay" />
        <Dialog.Content className="dashboard-dialog dashboard-dialog--ai">
          <div className="dashboard-dialog__topline">
            <div>
              <Dialog.Title className="dashboard-dialog__title">AI course draft</Dialog.Title>
              <Dialog.Description className="dashboard-dialog__subtitle">
                Shape a course brief, preview the structure, and keep it as a front-end concept.
                This does not create a real course yet.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="studio-icon-button studio-icon-button--plain"
                aria-label="Close AI draft dialog"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="dashboard-dialog__form">
            <label className="dashboard-field">
              <span>Course topic</span>
              <input
                value={form.topic}
                onChange={(event) =>
                  setForm((current) => ({ ...current, topic: event.target.value }))
                }
                placeholder="For example: Forces in Motion"
                autoFocus
              />
            </label>

            <div className="dashboard-dialog__grid">
              <label className="dashboard-field">
                <span>Target learner</span>
                <input
                  value={form.audience}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, audience: event.target.value }))
                  }
                  placeholder="For example: middle school learners"
                />
              </label>

              <label className="dashboard-field">
                <span>Pacing</span>
                <div className="dashboard-select">
                  <select
                    value={form.pace}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        pace: event.target.value as AICourseDraftPace,
                      }))
                    }
                  >
                    <option value="quick">Quick start</option>
                    <option value="balanced">Balanced</option>
                    <option value="deep">Deep dive</option>
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </label>
            </div>

            <label className="dashboard-field">
              <span>Learning outcome</span>
              <textarea
                rows={4}
                value={form.outcome}
                onChange={(event) =>
                  setForm((current) => ({ ...current, outcome: event.target.value }))
                }
                placeholder="For example: understand the basics, complete one guided practice, and leave with a clear next step."
              />
            </label>

            <section className="dashboard-ai-preview" data-testid="dashboard-ai-course-preview">
              <div className="dashboard-ai-preview__header">
                <span className="dashboard-ai-preview__badge">
                  <BrainCircuit size={14} />
                  AI preview
                </span>
                <small>Front-end only</small>
              </div>

              <h3>{preview.title}</h3>
              <p>{preview.summary}</p>

              <div className="dashboard-ai-preview__lessons">
                {preview.lessonTitles.map((lessonTitle, index) => (
                  <article key={`${lessonTitle}-${index}`} className="dashboard-ai-preview__lesson">
                    <span>{`Lesson ${index + 1}`}</span>
                    <strong>{lessonTitle}</strong>
                  </article>
                ))}
              </div>

              <div className="dashboard-ai-preview__note">
                <Bot size={15} />
                <span>{preview.coachNote}</span>
              </div>
            </section>

            <div className="dashboard-dialog__actions">
              <Dialog.Close asChild>
                <button type="button" className="studio-button studio-button--ghost">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="studio-button studio-button--ai"
                onClick={() => onUseDraft(preview)}
              >
                <BrainCircuit size={16} />
                <span>Use this brief</span>
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dashboard-dialog__overlay" />
        <AlertDialog.Content className="dashboard-dialog dashboard-dialog--confirm">
          <AlertDialog.Title className="dashboard-dialog__title">{title}</AlertDialog.Title>
          <AlertDialog.Description className="dashboard-dialog__subtitle">
            {description}
          </AlertDialog.Description>
          <div className="dashboard-dialog__actions">
            <AlertDialog.Cancel asChild>
              <button type="button" className="studio-button studio-button--ghost" disabled={pending}>
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              className="studio-button studio-button--danger"
              onClick={() => void onConfirm()}
              disabled={pending}
            >
              {pending ? <Loader2 className="dashboard-spin" size={16} /> : null}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
