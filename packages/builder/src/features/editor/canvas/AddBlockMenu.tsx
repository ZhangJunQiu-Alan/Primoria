import { useState, useRef, useEffect } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import { BLOCK_META, BLOCK_CATEGORIES } from '../blockRegistry';
import type { BlockType } from '@primoria/schema';
import { cn } from '@/lib/utils';

interface AddBlockMenuProps {
  onAdd: (type: BlockType) => void;
}

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 w-full rounded-lg border-2 border-dashed px-4 py-3',
          'text-sm text-muted-foreground hover:text-foreground hover:border-primary/50',
          'transition-colors',
          open && 'border-primary/50 text-foreground',
        )}
      >
        <PlusIcon className="h-4 w-4" />
        Add block
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-72 rounded-lg border bg-card shadow-lg p-2">
          {BLOCK_CATEGORIES.map((cat) => {
            const types = (Object.entries(BLOCK_META) as [BlockType, (typeof BLOCK_META)[BlockType]][]).filter(
              ([, m]) => m.category === cat.id,
            );
            return (
              <div key={cat.id} className="mb-2 last:mb-0">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {cat.label}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {types.map(([type, meta]) => (
                    <button
                      key={type}
                      onClick={() => {
                        onAdd(type);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <span aria-hidden>{meta.icon}</span>
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
