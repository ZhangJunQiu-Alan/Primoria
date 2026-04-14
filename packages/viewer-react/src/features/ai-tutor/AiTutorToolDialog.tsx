import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';
import type { MindMapNode } from '@/shared/api/viewer/types';

function modalTitle(modal: TutorToolModal) {
  return modal.kind === 'quiz' ? modal.payload.courseTitle : modal.payload.title;
}

function nodeTone(depth: number) {
  if (depth === 0) {
    return 'border-[#d3c2a8] bg-[linear-gradient(145deg,#fff8ef_0%,#f1e3cb_100%)] text-[#4a3a2a] shadow-[0_16px_30px_rgba(126,92,56,0.12)]';
  }

  if (depth === 1) {
    return 'border-[#d8d8c8] bg-[linear-gradient(145deg,#f9fbf3_0%,#eef3e1_100%)] text-[#485437]';
  }

  return 'border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] text-[#4d4239]';
}

function LogicChartBranch({
  node,
  depth = 0,
}: {
  node: MindMapNode;
  depth?: number;
}) {
  const children = node.children ?? [];

  return (
    <div className="flex items-center gap-8">
      <div
        className={`max-w-[18rem] min-w-[10rem] rounded-[22px] border px-4 py-3 text-sm font-semibold leading-6 ${nodeTone(depth)}`}
      >
        {node.label}
      </div>
      {children.length ? (
        <div className="relative flex flex-col gap-4 pl-8 before:absolute before:bottom-4 before:left-0 before:top-4 before:w-px before:bg-[#d9cdbd]">
          {children.map((child) => (
            <div
              key={child.id}
              className="relative before:absolute before:left-[-2rem] before:top-1/2 before:h-px before:w-8 before:bg-[#d9cdbd]"
            >
              <LogicChartBranch node={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
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
  const dialogWidth = modal.kind === 'mindmap' ? 'max-w-6xl' : 'max-w-2xl';

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[rgba(61,52,42,0.38)] px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className={`viewer-surface max-h-[85vh] w-full overflow-auto bg-[rgba(254,250,245,0.96)] p-6 ${dialogWidth}`}
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
          {modal.kind === 'mindmap' ? (
            <div className="overflow-auto rounded-[28px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(246,240,229,0.92)_100%)] p-5">
              <div className="inline-flex min-w-full items-start pb-2 pr-8 pt-2">
                <LogicChartBranch node={modal.payload.root} />
              </div>
            </div>
          ) : null}
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
