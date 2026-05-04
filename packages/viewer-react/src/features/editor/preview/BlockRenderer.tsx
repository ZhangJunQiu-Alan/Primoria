import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';
import type { Block } from '@primoria/schema';
import { trackInteractiveVisualAnalyticsEvent } from '@/shared/api/viewer/interactiveVisualAnalyticsApi';
import { InteractiveVisualEmbed } from '@/shared/interactive/InteractiveVisualEmbed';
import {
  getInteractiveVisualGenerationPreview,
  getInteractiveVisualModeOption,
  inferInteractiveVisualMode,
} from '@/shared/interactive/interactiveVisualModes';
import { richTextToHtml } from '../richText';

interface BlockRendererProps {
  block: Block;
}

/** Read-only learner-view renderer for a single block. */
export function BlockRenderer({ block }: BlockRendererProps) {
  const frame = getBlockStyleFrame(block.style);

  return (
    <div className={frame.className} style={frame.style}>
      <BlockContent block={block} />
    </div>
  );
}

export function getBlockStyleFrame(style: Block['style'] | undefined): {
  className: string;
  style: CSSProperties;
} {
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

  return {
    className: cn(spacing, align),
    style: {
      width: style?.width,
      height: style?.height,
    },
  };
}

function BlockContent({ block }: { block: Block }) {
  const c = block.content as Record<string, unknown>;

  switch (block.type) {
    // ── Text ──────────────────────────────────────────────────────────────────
    case 'text': {
      return (
        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(c['value']) }}
        />
      );
    }

    // ── Image ─────────────────────────────────────────────────────────────────
    case 'image':
      return c['url'] ? (
        <figure>
          <img
            src={String(c['url'])}
            alt="Block asset"
            className="rounded-md max-w-full"
          />
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
            <code>{String(c['code'] ?? c['starterCode'] ?? c['initialCode'] ?? '')}</code>
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
      return (() => {
        const generatedHtml = String(c['generatedHtml'] ?? c['legacyCustomHtml'] ?? '').trim();
        const title = String(c['title'] ?? 'AI Element');
        const mode = inferInteractiveVisualMode(
          String(c['aiPrompt'] ?? ''),
          typeof c['experienceMode'] === 'string' ? c['experienceMode'] : null,
        );
        const modeOption = getInteractiveVisualModeOption(mode);
        const generationPreview = getInteractiveVisualGenerationPreview({
          mode,
          prompt: String(c['aiPrompt'] ?? ''),
          template: String(c['template'] ?? 'generic'),
        });

        if (!generatedHtml) {
          return (
            <div className="rounded-[22px] border border-dashed border-[#d7d8d3] bg-[rgba(247,250,252,0.68)] p-6 text-left space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl">✨</div>
                  <p className="mt-2 font-semibold text-sm text-foreground">{title}</p>
                </div>
                <span className="rounded-full bg-[rgba(116,189,240,0.14)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3477ae]">
                  {modeOption.shortLabel}
                </span>
              </div>
              <div className="rounded-[18px] border border-white/80 bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8ea2]">{generationPreview.title}</p>
                <p className="mt-2 text-sm text-foreground">{generationPreview.promptHint}</p>
                <p className="mt-2 text-xs text-muted-foreground">{generationPreview.detail}</p>
              </div>
            </div>
          );
        }

        return (
          <div className="overflow-hidden rounded-[24px] border border-[#d9dde3] bg-[rgba(247,250,252,0.68)] p-2 shadow-[0_14px_28px_rgba(31,72,110,0.08)]">
            <InteractiveVisualEmbed
              title={title}
              html={generatedHtml}
              minHeight={360}
              className="w-full rounded-[20px] bg-transparent"
              onAnalyticsEvent={({ eventName, payload }) =>
                void trackInteractiveVisualAnalyticsEvent({
                  surface: 'builder-preview',
                  blockId: block.id,
                  interactionType:
                    eventName === 'visual_loaded'
                      ? 'view'
                      : eventName === 'control_changed'
                        ? 'input'
                        : eventName === 'action_clicked'
                          ? 'action'
                          : 'custom',
                  eventName,
                  payload,
                })
              }
            />
          </div>
        );
      })();

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
