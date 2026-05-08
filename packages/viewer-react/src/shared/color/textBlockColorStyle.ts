import type { CSSProperties } from 'react';
import { normalizeHexColor } from './colorUtils';

export function getTextBlockColorStyle(textColor: string | undefined) {
  const resolved = textColor ? normalizeHexColor(textColor) : null;

  if (!resolved) {
    return undefined;
  }

  return {
    color: resolved,
    '--tw-prose-body': resolved,
    '--tw-prose-headings': resolved,
    '--tw-prose-links': resolved,
    '--tw-prose-bold': resolved,
    '--tw-prose-counters': resolved,
    '--tw-prose-bullets': resolved,
    '--tw-prose-code': resolved,
  } as CSSProperties;
}
