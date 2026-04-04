import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';

export function AiTutorToolDialog({
  modal,
  onClose,
}: {
  modal: TutorToolModal;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/50 px-4">
      <div className="viewer-surface max-h-[85vh] w-full max-w-2xl overflow-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">
              {modal.kind}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--viewer-text)]">{modal.payload.title}</h2>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-[var(--viewer-border)] px-4 py-2 text-sm font-semibold text-[var(--viewer-text-muted)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {modal.kind === 'mindmap'
            ? modal.payload.nodes.map((node) => (
                <div
                  key={node.id}
                  className="rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--viewer-text)]"
                >
                  {node.label}
                </div>
              ))
            : null}
          {modal.kind === 'quiz'
            ? modal.payload.questions.map((question, index) => (
                <div key={`${question.prompt}-${index}`} className="rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-4">
                  <p className="text-sm font-black text-[var(--viewer-text)]">{question.prompt}</p>
                  <ul className="mt-3 list-disc pl-5 text-sm font-medium text-[var(--viewer-text-muted)]">
                    {question.options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ul>
                </div>
              ))
            : null}
          {modal.kind === 'presentation'
            ? modal.payload.slides.map((slide, index) => (
                <div key={`${slide.title}-${index}`} className="rounded-2xl bg-[var(--viewer-surface-muted)] px-4 py-4">
                  <p className="text-sm font-black text-[var(--viewer-text)]">{slide.title}</p>
                  <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">{slide.bullet}</p>
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
