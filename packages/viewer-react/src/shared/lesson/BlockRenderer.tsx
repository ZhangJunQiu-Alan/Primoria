import type { CSSProperties } from 'react';
import type { Block } from '@primoria/schema';
import { viewerCopy } from '@/shared/theme/copy';
import { richTextToHtml } from '@/shared/lesson/richText';
import type { LessonBlock, SortingBlock } from '@/shared/lesson/types';
import { cn } from '@/shared/utils/cn';

export function getBlockStyleFrame(style: Block['style'] | undefined) {
  const align =
    style?.alignment === 'center' ? 'text-center' : style?.alignment === 'right' ? 'text-right' : 'text-left';
  const spacing =
    style?.spacing === 'lg'
      ? 'py-6'
      : style?.spacing === 'sm'
      ? 'py-1'
      : style?.spacing === 'none'
      ? 'py-0'
      : 'py-3';

  return {
    className: cn(spacing, align),
    style: {
      width: style?.width,
      height: style?.height,
    } satisfies CSSProperties,
  };
}

export function BlockRenderer({ block }: { block: LessonBlock }) {
  const frame = 'style' in block ? getBlockStyleFrame(block.style) : { className: 'py-3', style: {} };

  return (
    <div className={frame.className} style={frame.style}>
      {'type' in block && block.type === 'sorting' ? <SortingRenderer block={block} /> : <CanonicalBlockRenderer block={block} />}
    </div>
  );
}

function SortingRenderer({ block }: { block: SortingBlock }) {
  return (
    <div className="space-y-3">
      <p className="font-semibold text-[var(--viewer-text)]">{block.content.prompt}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {block.content.items.map((item) => (
          <div key={item} className="rounded-2xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--viewer-text)]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function CanonicalBlockRenderer({ block }: { block: Block }) {
  const content = block.content as Record<string, unknown>;

  switch (block.type) {
    case 'text':
      return (
        <div
          className="prose prose-sm max-w-none text-[var(--viewer-text)]"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(content.value) }}
        />
      );
    case 'image':
      return content.url ? (
        <img src={String(content.url)} alt={String(content.altText ?? content.alt ?? 'Lesson image')} className="max-h-[340px] w-full rounded-2xl object-cover" />
      ) : (
        <div className="rounded-3xl border border-dashed border-[var(--viewer-border)] p-8 text-center text-sm text-[var(--viewer-text-muted)]">
          No image selected.
        </div>
      );
    case 'code-block':
    case 'code-playground':
    case 'code-execution':
      return (
        <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-slate-100">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            <span>{String(content.language ?? 'code')}</span>
            {block.type === 'code-playground' ? <span>Interactive</span> : null}
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-sm">
            <code>{String(content.code ?? content.starterCode ?? content.initialCode ?? '')}</code>
          </pre>
        </div>
      );
    case 'function-flow':
      return (
        <div className="space-y-3 rounded-3xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">Function flow</p>
          <p className="text-sm font-medium text-[var(--viewer-text-muted)]">
            Nodes: {Array.isArray(content.nodes) ? content.nodes.length : 0} · Edges: {Array.isArray(content.edges) ? content.edges.length : 0}
          </p>
        </div>
      );
    case 'multiple-choice': {
      const options = Array.isArray(content.options)
        ? (content.options as Array<{ id: string; text: string }>)
        : [];
      return (
        <div className="space-y-3">
          <p className="font-semibold text-[var(--viewer-text)]">{String(content.question ?? '')}</p>
          <div className="space-y-2">
            {options.map((option) => (
              <label key={option.id} className="flex items-center gap-3 rounded-2xl border border-[var(--viewer-border)] px-4 py-3 text-sm font-medium text-[var(--viewer-text)]">
                <input type={content.allowMultiple ? 'checkbox' : 'radio'} name={block.id} readOnly />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }
    case 'true-false':
      return (
        <div className="space-y-3">
          <p className="font-semibold text-[var(--viewer-text)]">{String(content.statement ?? '')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {['True', 'False'].map((label) => (
              <div key={label} className="rounded-2xl border border-[var(--viewer-border)] px-4 py-3 text-center text-sm font-semibold text-[var(--viewer-text)]">
                {label}
              </div>
            ))}
          </div>
        </div>
      );
    case 'fill-blank': {
      const template = String(content.template ?? '');
      const parts = template.split('___');
      return (
        <p className="text-sm leading-loose text-[var(--viewer-text)]">
          {parts.map((part, index) => (
            <span key={`${block.id}-${index}`}>
              {part}
              {index < parts.length - 1 ? (
                <span className="mx-1 inline-block min-w-24 rounded-lg border-b-2 border-[var(--viewer-primary)] px-2 py-1 text-center">
                  _____
                </span>
              ) : null}
            </span>
          ))}
        </p>
      );
    }
    case 'matching': {
      const pairs = Array.isArray(content.pairs)
        ? (content.pairs as Array<{ id: string; left: string; right: string }>)
        : [];
      return (
        <div className="space-y-2">
          {pairs.map((pair) => (
            <div key={pair.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className="rounded-2xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--viewer-text)]">
                {pair.left}
              </div>
              <span className="text-[var(--viewer-text-muted)]">↔</span>
              <div className="rounded-2xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--viewer-text)]">
                {pair.right}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'video': {
      const url = String(content.url ?? '');
      const youtubeId = /(?:youtu\.be\/|v=)([\w-]{11})/.exec(url)?.[1];
      return youtubeId ? (
        <div className="aspect-video overflow-hidden rounded-3xl">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="Lesson video"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[var(--viewer-border)] p-8 text-center text-sm text-[var(--viewer-text-muted)]">
          {url || 'No video URL selected.'}
        </div>
      );
    }
    case 'interactive-visual':
      return (
        <div className="rounded-3xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-6 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">Interactive visual</p>
          <h3 className="mt-2 text-lg font-black text-[var(--viewer-text)]">{String(content.title ?? 'Interactive Visual')}</h3>
          <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">{viewerCopy.lesson.unsupported}</p>
        </div>
      );
    default:
      return <div className="text-sm font-medium text-[var(--viewer-text-muted)]">[{block.type}]</div>;
  }
}

