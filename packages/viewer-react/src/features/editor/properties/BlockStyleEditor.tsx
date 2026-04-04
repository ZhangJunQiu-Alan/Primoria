import { useAppDispatch } from '@/store';
import { updateBlockStyle } from '@/store/editorSlice';
import type { Block } from '@primoria/schema';

interface BlockStyleEditorProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

const SPACING_OPTIONS = ['none', 'sm', 'md', 'lg'] as const;
const ALIGN_OPTIONS = ['left', 'center', 'right'] as const;

export function BlockStyleEditor({ block, lessonId, pageId }: BlockStyleEditorProps) {
  const dispatch = useAppDispatch();
  const style = block.style ?? {};

  function update(patch: Parameters<typeof updateBlockStyle>[0]['style']) {
    dispatch(updateBlockStyle({ lessonId, pageId, blockId: block.id, style: patch }));
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Appearance
      </p>

      {/* Spacing */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Spacing</label>
        <div className="flex gap-1">
          {SPACING_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => update({ spacing: s })}
              className={`flex-1 rounded border py-1 text-xs transition-colors ${
                (style.spacing ?? 'md') === s
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alignment */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Alignment</label>
        <div className="flex gap-1">
          {ALIGN_OPTIONS.map((a) => (
            <button
              key={a}
              onClick={() => update({ alignment: a })}
              className={`flex-1 rounded border py-1 text-xs transition-colors ${
                (style.alignment ?? 'left') === a
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent'
              }`}
            >
              {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
            </button>
          ))}
        </div>
      </div>

      {/* Width / Height */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Width (px)</label>
          <input
            type="number"
            min={0}
            placeholder="auto"
            value={style.width ?? ''}
            onChange={(e) =>
              update({ width: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Height (px)</label>
          <input
            type="number"
            min={0}
            placeholder="auto"
            value={style.height ?? ''}
            onChange={(e) =>
              update({ height: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>
      </div>
    </div>
  );
}
