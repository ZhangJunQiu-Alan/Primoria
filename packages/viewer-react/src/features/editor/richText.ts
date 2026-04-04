type RichTextAttributes = Record<string, unknown>;

export interface RichTextOp {
  insert: string;
  attributes?: RichTextAttributes;
}

interface RichTextLine {
  attrs: RichTextAttributes;
  html: string;
  text: string;
}

interface TipTapNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string }>;
  content?: TipTapNode[];
}

const EMPTY_RICH_TEXT_OPS: RichTextOp[] = [{ insert: '\n' }];

export function createEmptyRichTextValue() {
  return JSON.stringify(EMPTY_RICH_TEXT_OPS);
}

export function serializeRichTextValue(value: unknown) {
  return JSON.stringify(normalizeRichTextOps(value));
}

export function normalizeRichTextOps(value: unknown): RichTextOp[] {
  const normalized = normalizeRichTextOpsInternal(value);
  if (normalized.length === 0) {
    return [...EMPTY_RICH_TEXT_OPS];
  }

  const last = normalized[normalized.length - 1];
  if (!last?.insert.endsWith('\n')) {
    return [...normalized, { insert: '\n' }];
  }

  return normalized;
}

function normalizeRichTextOpsInternal(value: unknown): RichTextOp[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [...EMPTY_RICH_TEXT_OPS];
    }

    try {
      return normalizeRichTextOpsInternal(JSON.parse(trimmed));
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

      const attributes =
        item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes)
          ? (item.attributes as RichTextAttributes)
          : undefined;

      return [{ insert, ...(attributes ? { attributes } : {}) }];
    });
  }

  if (value && typeof value === 'object' && 'ops' in value) {
    return normalizeRichTextOpsInternal((value as { ops?: unknown }).ops);
  }

  return [...EMPTY_RICH_TEXT_OPS];
}

export function richTextToPlainText(value: unknown) {
  return normalizeRichTextOps(value)
    .map((op) => op.insert)
    .join('')
    .replace(/\n+/g, ' ')
    .trim();
}

export function isRichTextEmpty(value: unknown) {
  return richTextToPlainText(value).length === 0;
}

export function richTextToHtml(value: unknown) {
  const lines: RichTextLine[] = [];
  let currentHtml = '';
  let currentText = '';

  for (const op of normalizeRichTextOps(value)) {
    const parts = op.insert.split('\n');

    for (let index = 0; index < parts.length; index += 1) {
      const segment = parts[index] ?? '';

      if (segment) {
        currentHtml += renderInline(segment, op.attributes);
        currentText += segment;
      }

      if (index < parts.length - 1) {
        lines.push({
          attrs: extractBlockAttrs(op.attributes),
          html: currentHtml,
          text: currentText,
        });
        currentHtml = '';
        currentText = '';
      }
    }
  }

  if (currentHtml || currentText || lines.length === 0) {
    lines.push({ attrs: {}, html: currentHtml, text: currentText });
  }

  const htmlParts: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const listKind = line.attrs.list === 'ordered' || line.attrs.list === 'bullet' ? line.attrs.list : null;

    if (listKind) {
      const tag = listKind === 'ordered' ? 'ol' : 'ul';
      const items: string[] = [];

      while (index < lines.length) {
        const candidate = lines[index]!;
        if (candidate.attrs.list !== listKind) {
          break;
        }

        items.push(`<li>${candidate.html || '<br />'}</li>`);
        index += 1;
      }

      index -= 1;
      htmlParts.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    if (line.attrs['code-block']) {
      const codeLines: string[] = [];

      while (index < lines.length) {
        const candidate = lines[index]!;
        if (!candidate.attrs['code-block']) {
          break;
        }

        codeLines.push(candidate.text);
        index += 1;
      }

      index -= 1;
      htmlParts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const align =
      line.attrs.align === 'center' || line.attrs.align === 'right' || line.attrs.align === 'justify'
        ? String(line.attrs.align)
        : null;
    const style = align ? ` style="text-align:${align}"` : '';
    const headerLevel =
      typeof line.attrs.header === 'number' && line.attrs.header >= 1 && line.attrs.header <= 6
        ? line.attrs.header
        : null;

    if (headerLevel) {
      htmlParts.push(`<h${headerLevel}${style}>${line.html || '<br />'}</h${headerLevel}>`);
      continue;
    }

    htmlParts.push(`<p${style}>${line.html || '<br />'}</p>`);
  }

  return htmlParts.join('');
}

function renderInline(text: string, attributes?: RichTextAttributes) {
  let html = escapeHtml(text);

  if (attributes?.code) {
    html = `<code>${html}</code>`;
  }
  if (attributes?.bold) {
    html = `<strong>${html}</strong>`;
  }
  if (attributes?.italic) {
    html = `<em>${html}</em>`;
  }
  if (attributes?.underline) {
    html = `<u>${html}</u>`;
  }
  if (attributes?.strike) {
    html = `<s>${html}</s>`;
  }

  return html;
}

function extractBlockAttrs(attributes?: RichTextAttributes) {
  const attrs: RichTextAttributes = {};

  if (!attributes) {
    return attrs;
  }

  if (typeof attributes.header === 'number') {
    attrs.header = attributes.header;
  }
  if (attributes.list === 'ordered' || attributes.list === 'bullet') {
    attrs.list = attributes.list;
  }
  if (attributes['code-block']) {
    attrs['code-block'] = true;
  }
  if (
    attributes.align === 'left' ||
    attributes.align === 'center' ||
    attributes.align === 'right' ||
    attributes.align === 'justify'
  ) {
    attrs.align = attributes.align;
  }

  return attrs;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function tipTapDocToRichTextValue(doc: unknown) {
  const content =
    doc && typeof doc === 'object' && Array.isArray((doc as TipTapNode).content)
      ? (doc as TipTapNode).content ?? []
      : [];

  const ops = content.flatMap((node) => convertBlockNodeToOps(node));
  return JSON.stringify(ops.length > 0 ? ops : EMPTY_RICH_TEXT_OPS);
}

function convertBlockNodeToOps(node: TipTapNode): RichTextOp[] {
  switch (node.type) {
    case 'paragraph':
      return [...convertInlineNodesToOps(node.content), { insert: '\n' }];
    case 'heading': {
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
      return [
        ...convertInlineNodesToOps(node.content),
        { insert: '\n', attributes: { header: level } },
      ];
    }
    case 'bulletList':
      return (node.content ?? []).flatMap((item) => convertListItemToOps(item, 'bullet'));
    case 'orderedList':
      return (node.content ?? []).flatMap((item) => convertListItemToOps(item, 'ordered'));
    case 'codeBlock': {
      const text = extractPlainText(node.content);
      return [
        ...(text ? [{ insert: text }] : []),
        { insert: '\n', attributes: { 'code-block': true } },
      ];
    }
    default:
      return convertInlineNodesToOps(node.content);
  }
}

function convertListItemToOps(node: TipTapNode, list: 'bullet' | 'ordered'): RichTextOp[] {
  const inlineContent = (node.content ?? []).flatMap((child) => {
    if (child.type === 'paragraph') {
      return convertInlineNodesToOps(child.content);
    }

    return convertInlineNodesToOps(child.content);
  });

  return [...inlineContent, { insert: '\n', attributes: { list } }];
}

function convertInlineNodesToOps(nodes: TipTapNode[] | undefined): RichTextOp[] {
  return (nodes ?? []).flatMap((node) => {
    if (node.type === 'text') {
      const text = node.text ?? '';
      if (!text) {
        return [];
      }

      const attributes = tipTapMarksToAttributes(node.marks);
      return [{ insert: text, ...(attributes ? { attributes } : {}) }];
    }

    if (node.type === 'hardBreak') {
      return [{ insert: '\n' }];
    }

    return convertInlineNodesToOps(node.content);
  });
}

function tipTapMarksToAttributes(marks: TipTapNode['marks']) {
  const attributes: RichTextAttributes = {};

  for (const mark of marks ?? []) {
    switch (mark.type) {
      case 'bold':
        attributes.bold = true;
        break;
      case 'italic':
        attributes.italic = true;
        break;
      case 'strike':
        attributes.strike = true;
        break;
      case 'underline':
        attributes.underline = true;
        break;
      case 'code':
        attributes.code = true;
        break;
      default:
        break;
    }
  }

  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function extractPlainText(nodes: TipTapNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === 'text') {
        return node.text ?? '';
      }

      if (node.type === 'hardBreak') {
        return '\n';
      }

      return extractPlainText(node.content);
    })
    .join('');
}
