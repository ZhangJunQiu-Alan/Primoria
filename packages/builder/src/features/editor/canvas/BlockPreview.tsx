import { type Block } from '@primoria/schema';
import { BLOCK_META } from '../blockRegistry';
import { cn } from '@/lib/utils';

interface BlockPreviewProps {
  block: Block;
  isSelected: boolean;
  onClick: () => void;
}

export function BlockPreview({ block, isSelected, onClick }: BlockPreviewProps) {
  const meta = BLOCK_META[block.type];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border px-4 py-3 transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
          : 'border-border bg-card',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg leading-none select-none" aria-hidden>
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{meta.label}</div>
          <BlockSummary block={block} />
        </div>
      </div>
    </button>
  );
}

function BlockSummary({ block }: { block: Block }) {
  const c = block.content as Record<string, unknown>;

  switch (block.type) {
    case 'text': {
      const ops = (c['value'] as { ops: Array<{ insert?: string }> } | undefined)?.ops ?? [];
      const text = ops.map((o) => o.insert ?? '').join('').trim().slice(0, 80);
      return <p className="text-sm truncate text-foreground">{text || '(empty)'}</p>;
    }
    case 'code-block':
    case 'code-execution':
    case 'code-playground':
      return (
        <p className="text-sm font-mono truncate text-foreground opacity-70">
          {String(c['language'] ?? '')} — {String(c['code'] ?? c['starterCode'] ?? '').slice(0, 50)}
        </p>
      );
    case 'multiple-choice':
      return <p className="text-sm truncate text-foreground">{String(c['question'] ?? '(no question)')}</p>;
    case 'true-false':
      return <p className="text-sm truncate text-foreground">{String(c['statement'] ?? '(no statement)')}</p>;
    case 'fill-blank':
      return <p className="text-sm truncate text-foreground">{String(c['template'] ?? '(no template)')}</p>;
    case 'image':
      return (
        <p className="text-sm truncate text-muted-foreground">
          {String(c['url'] ?? c['altText'] ?? '(no image set)')}
        </p>
      );
    case 'interactive-visual':
      return (
        <p className="text-sm truncate text-foreground">
          {String(c['title'] ?? '')} <span className="text-muted-foreground">({String(c['template'] ?? '')})</span>
        </p>
      );
    default:
      return null;
  }
}
