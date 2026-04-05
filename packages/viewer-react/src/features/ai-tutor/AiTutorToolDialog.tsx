import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';

export function AiTutorToolDialog({
  modal,
  onClose,
}: {
  modal: TutorToolModal;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[rgba(61,52,42,0.38)] px-4 backdrop-blur-sm">
      <div className="viewer-surface max-h-[85vh] w-full max-w-2xl overflow-auto bg-[rgba(254,250,245,0.96)] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="viewer-botanical-eyebrow text-[0.72rem]">{modal.kind}</p>
            <h2
              className="mt-2 text-[2.1rem] font-semibold text-[var(--viewer-text)]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {modal.payload.title}
            </h2>
          </div>
          <button
            type="button"
            className="viewer-botanical-button viewer-botanical-button--secondary"
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
                  className="rounded-[20px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-sm font-semibold text-[var(--viewer-text)]"
                >
                  {node.label}
                </div>
              ))
            : null}
          {modal.kind === 'quiz'
            ? modal.payload.questions.map((question, index) => (
                <div key={`${question.prompt}-${index}`} className="rounded-[20px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] px-4 py-4">
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
                <div key={`${slide.title}-${index}`} className="rounded-[20px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] px-4 py-4">
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
