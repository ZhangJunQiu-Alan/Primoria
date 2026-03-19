import { useAppSelector } from '@/store';
import { BlockRenderer } from './BlockRenderer';

interface PreviewModeProps {
  lessonId: string;
  pageId: string;
}

/** Full learner-view preview of the active page, rendered inside the editor. */
export function PreviewMode({ lessonId, pageId }: PreviewModeProps) {
  const draft = useAppSelector((s) => s.editor.draft);
  const lesson = draft?.lessons.find((l) => l.lesson_id === lessonId);
  const page = lesson?.pages.find((p) => p.page_id === pageId);
  const blocks = page?.blocks ?? [];
  const sorted = [...blocks].sort((a, b) => a.position.order - b.position.order);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Preview banner */}
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
          <span className="font-semibold">Preview mode</span>
          <span className="text-amber-500">— learner view</span>
        </div>

        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No blocks on this page</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
