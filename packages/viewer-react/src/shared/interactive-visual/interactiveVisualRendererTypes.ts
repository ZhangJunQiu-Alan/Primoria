import type { ReactElement } from 'react';

/**
 * Interactive-visual blocks always render through a sandboxed HTML iframe.
 * Older content may carry an `engine` field naming one of the historical
 * aliases below; we accept those as the same thing so older drafts keep
 * rendering, but new artifacts should omit `engine` entirely.
 */
export const HTML_IFRAME_ENGINE_ALIASES = [
  'html-iframe',
  'interactive-html5',
  'gemini-html5',
  'fallback-html5',
] as const;

export type InteractiveVisualContent = Record<string, unknown> & {
  title?: unknown;
  description?: unknown;
  generatedHtml?: unknown;
};

export type InteractiveVisualRendererProps = {
  content: InteractiveVisualContent;
  title: string;
  description?: string;
  frameClassName?: string;
};

export type InteractiveVisualRenderer = (props: InteractiveVisualRendererProps) => ReactElement;

export function getInteractiveVisualHtml(content: InteractiveVisualContent) {
  if (typeof content.generatedHtml === 'string' && content.generatedHtml.trim()) {
    return content.generatedHtml;
  }

  return null;
}
