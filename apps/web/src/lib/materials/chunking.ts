// Pure text normalization + chunking for uploaded learning materials. A chunk is
// the unit lesson grounding cites ("file · p.3–4"), so chunks follow the
// material's own structure: a detected heading starts a new chunk, paragraphs
// are packed up to a target size, and only an oversized paragraph is split at
// sentence boundaries.

export type MaterialSegment = {
  text: string;
  /** 1-based PDF page; null for formats without pages. */
  page: number | null;
};

export type MaterialChunk = {
  ordinal: number;
  text: string;
  heading: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  charCount: number;
};

export const CHUNK_TARGET_CHARS = 1200;
export const CHUNK_MAX_CHARS = 1800;
const CHUNK_MIN_CHARS = 400;
const HEADING_MAX_CHARS = 80;

// pdf-parse page markers ("-- 3 of 12 --") and, on PDF pages, bare page
// numbers are layout, not content.
const PDF_PAGE_MARKER = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/i;
const BARE_PAGE_NUMBER = /^\s*-?\s*\d{1,4}\s*-?\s*$/;

export function normalizeMaterialText(text: string, options: { paged?: boolean } = {}): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .filter((line) => !PDF_PAGE_MARKER.test(line) && !(options.paged && BARE_PAGE_NUMBER.test(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const HEADING_PATTERNS: RegExp[] = [
  /^#{1,6}\s+\S/,
  /^第[一二三四五六七八九十百千零〇两\d]+[章节篇部讲课回单元]/,
  /^(?:chapter|section|lecture|unit|part|module|lesson)\s+[\dIVXLC]+\b/i,
  /^\d+(?:\.\d+){0,3}[.、\s]\s*\S/,
  /^[一二三四五六七八九十]+[、.．]\s*\S/,
];

export function isHeadingLine(paragraph: string): boolean {
  const text = paragraph.trim();
  if (!text || text.includes("\n") || text.length > HEADING_MAX_CHARS) return false;
  if (/^#{1,6}\s+\S/.test(text)) return true;
  // Sentences end in punctuation; headings do not.
  if (/[。．.!?！？;；:：,，]$/.test(text)) return false;
  return HEADING_PATTERNS.some((pattern) => pattern.test(text));
}

function headingLabel(paragraph: string): string {
  return paragraph.trim().replace(/^#{1,6}\s+/, "").slice(0, HEADING_MAX_CHARS);
}

// Split one oversized paragraph at sentence ends; hard-split any sentence that
// still exceeds the cap.
export function splitLongParagraph(text: string, maxChars = CHUNK_MAX_CHARS): string[] {
  const sentences = text.split(/(?<=[。！？!?；;.])\s+|(?<=[。！？；])/u).filter((s) => s.trim());
  const pieces: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) pieces.push(current);
      current = "";
      for (let i = 0; i < sentence.length; i += maxChars) pieces.push(sentence.slice(i, i + maxChars));
      continue;
    }
    const joined = current ? `${current}${/[　-鿿]$/u.test(current) ? "" : " "}${sentence}` : sentence;
    if (joined.length > maxChars) {
      pieces.push(current);
      current = sentence;
    } else {
      current = joined;
    }
  }
  if (current) pieces.push(current);
  return pieces.map((piece) => piece.trim()).filter(Boolean);
}

type Paragraph = { text: string; page: number | null };

const CJK_EDGE = /[　-〿㐀-䶿一-鿿＀-￯]/u;

// Join a hard-wrapped PDF line onto the paragraph so far: no space between CJK
// characters, de-hyphenate "exam-\nple", otherwise a single space.
function joinWrappedLine(current: string, line: string): string {
  if (!current) return line;
  if (/[A-Za-z]-$/.test(current) && /^[a-z]/.test(line)) return `${current.slice(0, -1)}${line}`;
  if (CJK_EDGE.test(current.slice(-1)) || CJK_EDGE.test(line[0])) return `${current}${line}`;
  return `${current} ${line}`;
}

/** PDF page text has a newline at every visual line and rarely a blank line
 * between paragraphs. Rebuild paragraphs: a heading line stands alone, and a
 * paragraph ends at a sentence-final line noticeably shorter than a full line. */
export function paragraphsFromWrappedLines(block: string): string[] {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return lines;
  const lengths = lines.map((line) => line.length).sort((a, b) => a - b);
  const fullLine = lengths[Math.floor((lengths.length - 1) * 0.9)];
  const out: string[] = [];
  let current = "";
  for (const line of lines) {
    if (isHeadingLine(line)) {
      if (current) out.push(current);
      current = "";
      out.push(line);
      continue;
    }
    current = joinWrappedLine(current, line);
    if (/[。！？.!?:：」”)]$/u.test(line) && line.length < fullLine * 0.85) {
      out.push(current);
      current = "";
    }
  }
  if (current) out.push(current);
  return out;
}

function paragraphsOf(segments: MaterialSegment[]): Paragraph[] {
  const out: Paragraph[] = [];
  for (const segment of segments) {
    const paged = segment.page !== null;
    const normalized = normalizeMaterialText(segment.text, { paged });
    if (!normalized) continue;
    for (const raw of normalized.split(/\n\s*\n/)) {
      const block = raw.trim();
      if (!block) continue;
      for (const text of paged ? paragraphsFromWrappedLines(block) : [block]) out.push({ text, page: segment.page });
    }
  }
  return out;
}

export function chunkMaterial(segments: MaterialSegment[]): MaterialChunk[] {
  const chunks: MaterialChunk[] = [];
  let parts: string[] = [];
  let length = 0;
  let pages: number[] = [];
  let heading: string | null = null;
  let chunkHeading: string | null = null;
  let headingOnly = true;

  const flush = () => {
    if (parts.length === 0) return;
    const text = parts.join("\n\n");
    chunks.push({
      ordinal: chunks.length,
      text,
      heading: chunkHeading,
      pageStart: pages.length ? Math.min(...pages) : null,
      pageEnd: pages.length ? Math.max(...pages) : null,
      charCount: text.length,
    });
    parts = [];
    length = 0;
    pages = [];
    headingOnly = true;
  };

  const append = (text: string, page: number | null, isHeading: boolean) => {
    if (parts.length === 0) chunkHeading = heading;
    parts.push(text);
    length += text.length + (parts.length > 1 ? 2 : 0);
    if (page !== null) pages.push(page);
    if (!isHeading) headingOnly = false;
  };

  for (const paragraph of paragraphsOf(segments)) {
    if (isHeadingLine(paragraph.text)) {
      // Consecutive headings ("Chapter 2" then "2.1 Limits") stay together.
      if (!headingOnly) flush();
      heading = headingLabel(paragraph.text);
      append(paragraph.text, paragraph.page, true);
      // A chunk is labelled by its most specific leading heading.
      chunkHeading = heading;
      continue;
    }

    if (paragraph.text.length > CHUNK_MAX_CHARS) {
      if (!headingOnly) flush();
      for (const piece of splitLongParagraph(paragraph.text)) {
        if (length + piece.length + 2 > CHUNK_MAX_CHARS) flush();
        append(piece, paragraph.page, false);
      }
      continue;
    }

    const next = length + paragraph.text.length + 2;
    if (next > CHUNK_MAX_CHARS || (next > CHUNK_TARGET_CHARS && length >= CHUNK_MIN_CHARS)) flush();
    append(paragraph.text, paragraph.page, false);
  }
  flush();
  return chunks;
}

/** Content language of a material: Chinese when CJK characters outnumber Latin
 * words in a bounded sample. Unlike detectKgLanguage (any CJK char → zh), an
 * English text that quotes a few Chinese terms stays English. */
export function detectMaterialLanguage(text: string): "zh" | "en" {
  const sample = text.slice(0, 20_000);
  const cjk = sample.match(/[㐀-䶿一-鿿]/gu)?.length ?? 0;
  const latinWords = sample.match(/[A-Za-z]{2,}/g)?.length ?? 0;
  return cjk > 0 && cjk >= latinWords ? "zh" : "en";
}
