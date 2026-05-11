import type { ReactElement } from 'react';

export const DEFAULT_INTERACTIVE_VISUAL_ENGINE = 'html-iframe';

const HTML_IFRAME_ENGINE_ALIASES = [
  DEFAULT_INTERACTIVE_VISUAL_ENGINE,
  'interactive-html5',
  'gemini-html5',
  'fallback-html5',
] as const;

export const TRUSTED_INTERACTIVE_VISUAL_ENGINES = ['r3f-cell-3d', 'physics-canvas'] as const;

export const INTERACTIVE_VISUAL_ENGINES = [
  DEFAULT_INTERACTIVE_VISUAL_ENGINE,
  ...TRUSTED_INTERACTIVE_VISUAL_ENGINES,
] as const;

export type InteractiveVisualEngine = (typeof INTERACTIVE_VISUAL_ENGINES)[number];
export type TrustedInteractiveVisualEngine = (typeof TRUSTED_INTERACTIVE_VISUAL_ENGINES)[number];

export type InteractiveVisualContent = Record<string, unknown> & {
  engine?: unknown;
  title?: unknown;
  description?: unknown;
  generatedHtml?: unknown;
  legacyCustomHtml?: unknown;
};

export type InteractiveVisualRendererProps = {
  content: InteractiveVisualContent;
  title: string;
  description?: string;
  frameClassName?: string;
};

export type InteractiveVisualRenderer = (props: InteractiveVisualRendererProps) => ReactElement;

export function resolveInteractiveVisualEngine(content: InteractiveVisualContent): InteractiveVisualEngine | null {
  const engine = typeof content.engine === 'string' ? content.engine.trim() : '';

  if (!engine) {
    return DEFAULT_INTERACTIVE_VISUAL_ENGINE;
  }

  if (HTML_IFRAME_ENGINE_ALIASES.includes(engine as (typeof HTML_IFRAME_ENGINE_ALIASES)[number])) {
    return DEFAULT_INTERACTIVE_VISUAL_ENGINE;
  }

  return INTERACTIVE_VISUAL_ENGINES.includes(engine as InteractiveVisualEngine)
    ? (engine as InteractiveVisualEngine)
    : null;
}

export function getInteractiveVisualHtml(content: InteractiveVisualContent) {
  if (typeof content.generatedHtml === 'string' && content.generatedHtml.trim()) {
    return content.generatedHtml;
  }

  if (typeof content.legacyCustomHtml === 'string' && content.legacyCustomHtml.trim()) {
    return content.legacyCustomHtml;
  }

  return null;
}
