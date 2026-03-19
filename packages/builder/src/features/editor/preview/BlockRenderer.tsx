import { cn } from '@/lib/utils';
import type { Block } from '@primoria/schema';

interface BlockRendererProps {
  block: Block;
}

/** Read-only learner-view renderer for a single block. */
export function BlockRenderer({ block }: BlockRendererProps) {
  const style = block.style;
  const align =
    style?.alignment === 'center'
      ? 'text-center'
      : style?.alignment === 'right'
      ? 'text-right'
      : 'text-left';
  const spacing =
    style?.spacing === 'lg'
      ? 'py-6'
      : style?.spacing === 'sm'
      ? 'py-1'
      : style?.spacing === 'none'
      ? 'py-0'
      : 'py-3';

  return (
    <div className={cn(spacing, align)} style={{ width: style?.width, height: style?.height }}>
      <BlockContent block={block} />
    </div>
  );
}

function BlockContent({ block }: { block: Block }) {
  const c = block.content as Record<string, unknown>;

  switch (block.type) {
    // ── Text ──────────────────────────────────────────────────────────────────
    case 'text': {
      const ops = ((c['value'] as { ops?: Array<{ insert?: string }> } | undefined)?.ops ?? []);
      const text = ops.map((o) => o.insert ?? '').join('');
      return (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
          {text}
        </div>
      );
    }

    // ── Image ─────────────────────────────────────────────────────────────────
    case 'image':
      return c['url'] ? (
        <figure>
          <img
            src={String(c['url'])}
            alt={String(c['altText'] ?? '')}
            className="rounded-md max-w-full"
          />
          {!!c['caption'] && (
            <figcaption className="mt-1 text-xs text-muted-foreground">
              {String(c['caption'])}
            </figcaption>
          )}
        </figure>
      ) : (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground text-sm">
          No image set
        </div>
      );

    // ── Code block ────────────────────────────────────────────────────────────
    case 'code-block':
    case 'code-playground':
    case 'code-execution':
      return (
        <div className="rounded-md bg-muted border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/70">
            <span className="text-xs font-mono text-muted-foreground">{String(c['language'] ?? '')}</span>
            {block.type === 'code-playground' && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Interactive
              </span>
            )}
          </div>
          <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
            <code>{String(c['code'] ?? c['starterCode'] ?? '')}</code>
          </pre>
        </div>
      );

    // ── Multiple choice ───────────────────────────────────────────────────────
    case 'multiple-choice': {
      const opts = (c['options'] as Array<{ id: string; text: string }> | undefined) ?? [];
      return (
        <div className="space-y-3">
          <p className="font-medium">{String(c['question'] ?? '')}</p>
          <div className="space-y-2">
            {opts.map((o) => (
              <label key={o.id} className="flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer hover:bg-accent transition-colors">
                <input type={c['allowMultiple'] ? 'checkbox' : 'radio'} name={block.id} className="h-4 w-4" readOnly />
                <span className="text-sm">{o.text}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    // ── True / False ──────────────────────────────────────────────────────────
    case 'true-false':
      return (
        <div className="space-y-3">
          <p className="font-medium">{String(c['statement'] ?? '')}</p>
          <div className="flex gap-3">
            {['True', 'False'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 rounded-lg border px-6 py-2.5 cursor-pointer hover:bg-accent transition-colors flex-1 justify-center">
                <input type="radio" name={block.id} className="h-4 w-4" readOnly />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );

    // ── Fill blank ────────────────────────────────────────────────────────────
    case 'fill-blank': {
      const template = String(c['template'] ?? '');
      const parts = template.split('___');
      return (
        <p className="text-sm leading-loose">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && (
                <input
                  type="text"
                  className="inline-block border-b-2 border-primary bg-transparent w-24 text-center outline-none mx-1"
                  readOnly
                />
              )}
            </span>
          ))}
        </p>
      );
    }

    // ── Matching ──────────────────────────────────────────────────────────────
    case 'matching': {
      const pairs = (c['pairs'] as Array<{ id: string; left: string; right: string }> | undefined) ?? [];
      return (
        <div className="space-y-2">
          {pairs.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <div className="rounded-md border px-3 py-2 text-sm bg-muted/30">{p.left}</div>
              <span className="text-muted-foreground">↔</span>
              <div className="rounded-md border px-3 py-2 text-sm bg-muted/30">{p.right}</div>
            </div>
          ))}
        </div>
      );
    }

    // ── Video ─────────────────────────────────────────────────────────────────
    case 'video': {
      const url = String(c['url'] ?? '');
      const ytId = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1];
      if (ytId) {
        return (
          <div className="aspect-video rounded-md overflow-hidden">
            <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen title="Video" />
          </div>
        );
      }
      return (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground text-sm">
          {url || 'No video URL set'}
        </div>
      );
    }

    // ── Interactive visual ────────────────────────────────────────────────────
    case 'interactive-visual':
      return (
        <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-1">
          <div className="text-2xl">🔭</div>
          <p className="font-medium text-sm">{String(c['title'] ?? 'Interactive Visual')}</p>
          <p className="text-xs text-muted-foreground">
            Template: <span className="font-mono">{String(c['template'] ?? '')}</span>
          </p>
          <p className="text-xs text-muted-foreground italic">
            Rendered in full player
          </p>
        </div>
      );

    // ── Animation ────────────────────────────────────────────────────────────
    case 'animation':
      return (
        <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-1">
          <div className="text-2xl">🎬</div>
          <p className="text-sm text-muted-foreground">
            Animation: {String(c['preset'] || 'custom')}
          </p>
        </div>
      );

    // ── Function flow ─────────────────────────────────────────────────────────
    case 'function-flow': {
      const nodes = (c['nodes'] as Array<{ id: string; label: string; type: string }> | undefined) ?? [];
      return (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Flow diagram — {nodes.length} nodes</p>
          <div className="flex flex-wrap gap-2">
            {nodes.map((n) => (
              <span key={n.id} className="rounded border px-2 py-1 text-xs bg-card">
                {n.label || n.id}
              </span>
            ))}
          </div>
        </div>
      );
    }

    default:
      return <div className="text-sm text-muted-foreground italic">[{block.type}]</div>;
  }
}
