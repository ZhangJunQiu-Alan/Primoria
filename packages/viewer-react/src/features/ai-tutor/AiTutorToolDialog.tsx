import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';

function modalTitle(modal: TutorToolModal) {
  return modal.kind === 'quiz' ? modal.payload.courseTitle : modal.payload.title;
}

export function AiTutorToolDialog({
  modal,
  onClose,
  closeLabel,
  kindLabel,
}: {
  modal: TutorToolModal;
  onClose: () => void;
  closeLabel: string;
  kindLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[rgba(61,52,42,0.38)] px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="viewer-surface max-h-[85vh] w-full max-w-2xl overflow-auto bg-[rgba(254,250,245,0.96)] p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="viewer-botanical-eyebrow text-[0.72rem]">{kindLabel}</p>
            <h2
              className="mt-2 text-[2.1rem] font-semibold text-[var(--viewer-text)]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {modalTitle(modal)}
            </h2>
          </div>
          <button
            type="button"
            className="viewer-botanical-button viewer-botanical-button--secondary"
            onClick={onClose}
          >
            {closeLabel}
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
          {modal.kind === 'report'
            ? modal.payload.body
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, index) => (
                  <div
                    key={`${paragraph.slice(0, 24)}-${index}`}
                    className="rounded-[20px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] px-4 py-4 text-sm font-medium leading-7 text-[var(--viewer-text-muted)]"
                  >
                    {paragraph}
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
