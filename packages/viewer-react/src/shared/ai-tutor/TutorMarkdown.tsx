import { Fragment, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

type MarkdownBlock =
  | {
      type: 'paragraph';
      content: string;
    }
  | {
      type: 'ordered-list' | 'unordered-list';
      items: string[];
    };

type ListBlockType = Extract<MarkdownBlock['type'], 'ordered-list' | 'unordered-list'>;

const orderedListPattern = /^\d+\.\s*(.+)$/;
const unorderedListPattern = /^[-*+]\s+(.+)$/;

function flushParagraph(blocks: MarkdownBlock[], lines: string[]) {
  const content = lines.join('\n').trim();
  if (content) {
    blocks.push({ type: 'paragraph', content });
  }
  lines.length = 0;
}

function flushList(blocks: MarkdownBlock[], listType: ListBlockType | null, items: string[]) {
  if (listType && items.length) {
    blocks.push({ type: listType, items: [...items] });
  }
  items.length = 0;
}

function parseBlocks(text: string): MarkdownBlock[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const blocks: MarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];
  let listType: ListBlockType | null = null;

  for (const line of normalized.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(blocks, paragraphLines);
      flushList(blocks, listType, listItems);
      listType = null;
      continue;
    }

    const orderedMatch = trimmed.match(orderedListPattern);
    if (orderedMatch) {
      flushParagraph(blocks, paragraphLines);
      if (listType && listType !== 'ordered-list') {
        flushList(blocks, listType, listItems);
      }
      listType = 'ordered-list';
      listItems.push(orderedMatch[1]);
      continue;
    }

    const unorderedMatch = trimmed.match(unorderedListPattern);
    if (unorderedMatch) {
      flushParagraph(blocks, paragraphLines);
      if (listType && listType !== 'unordered-list') {
        flushList(blocks, listType, listItems);
      }
      listType = 'unordered-list';
      listItems.push(unorderedMatch[1]);
      continue;
    }

    if (listType) {
      flushList(blocks, listType, listItems);
      listType = null;
    }

    paragraphLines.push(line);
  }

  flushParagraph(blocks, paragraphLines);
  flushList(blocks, listType, listItems);
  return blocks;
}

function pushPlain(nodes: ReactNode[], text: string, keyPrefix: string, indexRef: { current: number }) {
  if (!text) {
    return;
  }
  nodes.push(
    <Fragment key={`${keyPrefix}-text-${indexRef.current}`}>
      {text}
    </Fragment>,
  );
  indexRef.current += 1;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const indexRef = { current: 0 };
  let cursor = 0;

  while (cursor < text.length) {
    if (text[cursor] === '\n') {
      nodes.push(<br key={`${keyPrefix}-br-${indexRef.current}`} />);
      indexRef.current += 1;
      cursor += 1;
      continue;
    }

    const boldMarker = text.startsWith('**', cursor) ? '**' : text.startsWith('__', cursor) ? '__' : null;
    if (boldMarker) {
      const closeIndex = text.indexOf(boldMarker, cursor + boldMarker.length);
      if (closeIndex !== -1) {
        const content = text.slice(cursor + boldMarker.length, closeIndex);
        nodes.push(
          <strong key={`${keyPrefix}-strong-${indexRef.current}`} className="font-semibold text-inherit">
            {renderInline(content, `${keyPrefix}-strong-${indexRef.current}`)}
          </strong>,
        );
        indexRef.current += 1;
        cursor = closeIndex + boldMarker.length;
        continue;
      }
    }

    if (text[cursor] === '`') {
      const closeIndex = text.indexOf('`', cursor + 1);
      if (closeIndex !== -1) {
        nodes.push(
          <code
            key={`${keyPrefix}-code-${indexRef.current}`}
            className="rounded bg-[rgba(77,66,57,0.08)] px-1.5 py-0.5 font-mono text-[0.95em] text-inherit"
          >
            {text.slice(cursor + 1, closeIndex)}
          </code>,
        );
        indexRef.current += 1;
        cursor = closeIndex + 1;
        continue;
      }
    }

    let nextIndex = text.length;
    const newlineIndex = text.indexOf('\n', cursor);
    if (newlineIndex !== -1) {
      nextIndex = Math.min(nextIndex, newlineIndex);
    }
    const boldStart = text.indexOf('**', cursor);
    if (boldStart !== -1) {
      nextIndex = Math.min(nextIndex, boldStart);
    }
    const altBoldStart = text.indexOf('__', cursor);
    if (altBoldStart !== -1) {
      nextIndex = Math.min(nextIndex, altBoldStart);
    }
    const codeStart = text.indexOf('`', cursor);
    if (codeStart !== -1) {
      nextIndex = Math.min(nextIndex, codeStart);
    }

    if (nextIndex === cursor) {
      pushPlain(nodes, text[cursor], keyPrefix, indexRef);
      cursor += 1;
      continue;
    }

    pushPlain(nodes, text.slice(cursor, nextIndex), keyPrefix, indexRef);
    cursor = nextIndex;
  }

  return nodes;
}

export function TutorMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseBlocks(text);
  if (!blocks.length) {
    return null;
  }

  return (
    <div className={cn('space-y-3 break-words', className)}>
      {blocks.map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <p key={`paragraph-${index}`} className="m-0">
              {renderInline(block.content, `paragraph-${index}`)}
            </p>
          );
        }

        const ListTag = block.type === 'ordered-list' ? 'ol' : 'ul';
        return (
          <ListTag
            key={`list-${index}`}
            className={cn(
              'm-0 space-y-1 pl-5',
              block.type === 'ordered-list' ? 'list-decimal' : 'list-disc',
            )}
          >
            {block.items.map((item, itemIndex) => (
              <li key={`list-${index}-item-${itemIndex}`}>{renderInline(item, `list-${index}-item-${itemIndex}`)}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
