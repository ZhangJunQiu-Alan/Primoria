type RichTextAttributes = Record<string, unknown>;

type RichTextOp = {
  insert: string;
  attributes?: RichTextAttributes;
};

function normalizeRichTextOps(value: unknown): RichTextOp[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [{ insert: '\n' }];
    }
    try {
      return normalizeRichTextOps(JSON.parse(trimmed));
    } catch {
      return [{ insert: value }];
    }
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }
      const insert = typeof item.insert === 'string' ? item.insert : '';
      if (!insert) {
        return [];
      }
      return [
        {
          insert,
          ...(item.attributes && typeof item.attributes === 'object' ? { attributes: item.attributes } : {}),
        },
      ];
    });
  }

  if (value && typeof value === 'object' && 'ops' in value) {
    return normalizeRichTextOps((value as { ops?: unknown }).ops);
  }

  return [{ insert: '\n' }];
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInline(text: string, attributes?: RichTextAttributes) {
  let html = escapeHtml(text);
  if (attributes?.code) html = `<code>${html}</code>`;
  if (attributes?.bold) html = `<strong>${html}</strong>`;
  if (attributes?.italic) html = `<em>${html}</em>`;
  if (attributes?.underline) html = `<u>${html}</u>`;
  if (attributes?.strike) html = `<s>${html}</s>`;
  return html;
}

export function richTextToHtml(value: unknown) {
  const html = normalizeRichTextOps(value)
    .map((op) => renderInline(op.insert, op.attributes).replaceAll('\n', '<br />'))
    .join('');
  return html || '<p><br /></p>';
}

export function richTextToPlainText(value: unknown) {
  const text = normalizeRichTextOps(value)
    .map((op) => op.insert)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}
