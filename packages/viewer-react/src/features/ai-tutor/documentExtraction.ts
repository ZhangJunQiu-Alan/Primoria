import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { normalizeViewerLanguage } from '@/shared/i18n/locale';
import { countMeaningfulChars, extractMeaningfulChars } from '@/shared/utils/textStats';

export type TutorUploadKind = 'pdf' | 'docx' | 'ppt' | 'doc' | 'unsupported';
export type PdfTextItem = {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
};

const PDF_MIME_TYPES = new Set(['application/pdf']);
const DOCX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const DOCX_DEFAULT_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPT_MIME_TYPES = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const DOC_MIME_TYPES = new Set(['application/msword']);
const PDF_MARGIN_LINE_WINDOW = 3;
const MINIMUM_USABLE_TUTOR_TEXT_CHARS = 20;
const PAGE_NUMBER_ONLY_PATTERN = /^\d+$/u;
const PAGE_NUMBER_FRACTION_PATTERN = /^\d+\s*\/\s*\d+$/u;
const CHINESE_PAGE_NUMBER_PATTERN = /^第\s*\d+\s*页$/u;
const ENGLISH_PAGE_NUMBER_PATTERN = /^page\s*\d+$/iu;
const ENGLISH_PAGE_OF_NUMBER_PATTERN = /^page\s*\d+\s*of\s*\d+$/iu;

const extractionCopy = {
  'zh-CN': {
    noUsableText: '无法从该资料中提取可用文本。',
    unsupportedPpt: 'PPT/PPTX 暂不支持直接解析，请先导出为 PDF 再上传。',
    unsupportedDoc: 'DOC 暂不支持直接解析，请另存为 DOCX 或 PDF 后再上传。',
    unsupportedFile: '暂不支持这种文件类型，请上传 PDF 或 DOCX。',
  },
  en: {
    noUsableText: 'No usable text could be extracted from this file.',
    unsupportedPpt: 'PPT/PPTX is not supported directly yet. Export it to PDF first.',
    unsupportedDoc: 'Legacy DOC is not supported yet. Save it as DOCX or PDF first.',
    unsupportedFile: 'This file type is not supported yet. Upload a PDF or DOCX.',
  },
} as const;

type PositionedPdfTextItem = {
  text: string;
  x: number;
  y: number;
  height: number;
};

type PdfMarginCandidate = {
  index: number;
  line: string;
  comparable: string;
  zone: 'top' | 'bottom';
};

function getExtractionCopy() {
  const language =
    typeof document === 'undefined'
      ? 'zh-CN'
      : normalizeViewerLanguage(document.documentElement.lang);

  return extractionCopy[language];
}

function normalizeRawExtractedText(text: string) {
  return text
    .replaceAll('\u0000', '')
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n');
}

function normalizePdfLineText(text: string) {
  return normalizeRawExtractedText(text)
    .replace(/\s+/gu, ' ')
    .trim();
}

function lineTolerance(height: number) {
  return Math.max(2, Math.min(8, Math.abs(height) * 0.45 || 2));
}

function extensionOf(name: string) {
  const normalized = name.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf('.');
  return lastDot >= 0 ? normalized.slice(lastDot) : '';
}

export function classifyTutorUpload(file: File): TutorUploadKind {
  const extension = extensionOf(file.name);
  const mimeType = file.type.trim().toLowerCase();

  if (extension === '.pdf' || PDF_MIME_TYPES.has(mimeType)) {
    return 'pdf';
  }

  if (extension === '.docx' || DOCX_MIME_TYPES.has(mimeType)) {
    return 'docx';
  }

  if (extension === '.ppt' || extension === '.pptx' || PPT_MIME_TYPES.has(mimeType)) {
    return 'ppt';
  }

  if (extension === '.doc' || DOC_MIME_TYPES.has(mimeType)) {
    return 'doc';
  }

  return 'unsupported';
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const value = item as Record<string, unknown>;
  return (
    typeof value.str === 'string' &&
    typeof value.dir === 'string' &&
    Array.isArray(value.transform) &&
    value.transform.length >= 6 &&
    typeof value.transform[4] === 'number' &&
    typeof value.transform[5] === 'number' &&
    typeof value.height === 'number' &&
    typeof value.width === 'number' &&
    typeof value.fontName === 'string' &&
    typeof value.hasEOL === 'boolean'
  );
}

export function reconstructPdfPageLines(items: PdfTextItem[]) {
  const positionedItems = items
    .map((item): PositionedPdfTextItem | null => {
      const text = normalizePdfLineText(item.str);
      if (!text) {
        return null;
      }

      return {
        text,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        height: item.height,
      };
    })
    .filter((item): item is PositionedPdfTextItem => item !== null)
    .sort((left, right) => {
      if (Math.abs(left.y - right.y) > 0.01) {
        return right.y - left.y;
      }
      return left.x - right.x;
    });

  const lines: Array<{ y: number; tolerance: number; items: PositionedPdfTextItem[] }> = [];

  for (const item of positionedItems) {
    const itemTolerance = lineTolerance(item.height);
    const matchingLine = lines.find((line) => Math.abs(line.y - item.y) <= Math.max(line.tolerance, itemTolerance));

    if (matchingLine) {
      matchingLine.items.push(item);
      matchingLine.tolerance = Math.max(matchingLine.tolerance, itemTolerance);
      matchingLine.y =
        matchingLine.items.reduce((total, current) => total + current.y, 0) / matchingLine.items.length;
      continue;
    }

    lines.push({
      y: item.y,
      tolerance: itemTolerance,
      items: [item],
    });
  }

  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) =>
      normalizePdfLineText(
        line.items
          .sort((left, right) => left.x - right.x)
          .map((item) => item.text)
          .join(' '),
      ),
    )
    .filter((line) => line.length > 0);
}

export function cleanTutorExtractedText(text: string) {
  return extractMeaningfulChars(normalizeRawExtractedText(text));
}

function normalizePdfMarginComparableText(text: string) {
  return cleanTutorExtractedText(text).toLowerCase();
}

export function isStandalonePageNumberLine(line: string) {
  const normalized = normalizePdfLineText(line);
  if (!normalized) {
    return false;
  }

  return (
    PAGE_NUMBER_ONLY_PATTERN.test(normalized) ||
    PAGE_NUMBER_FRACTION_PATTERN.test(normalized) ||
    CHINESE_PAGE_NUMBER_PATTERN.test(normalized) ||
    ENGLISH_PAGE_NUMBER_PATTERN.test(normalized) ||
    ENGLISH_PAGE_OF_NUMBER_PATTERN.test(normalized)
  );
}

function collectPdfMarginCandidates(lines: string[]) {
  const nonEmptyLines = lines
    .map((line, index) => ({ line: normalizePdfLineText(line), index }))
    .filter((entry) => entry.line.length > 0);

  const topCandidates = nonEmptyLines.slice(0, PDF_MARGIN_LINE_WINDOW);
  const bottomCandidates = nonEmptyLines.slice(-PDF_MARGIN_LINE_WINDOW);

  return [
    ...topCandidates.map(
      (entry): PdfMarginCandidate => ({
        index: entry.index,
        line: entry.line,
        comparable: normalizePdfMarginComparableText(entry.line),
        zone: 'top',
      }),
    ),
    ...bottomCandidates.map(
      (entry): PdfMarginCandidate => ({
        index: entry.index,
        line: entry.line,
        comparable: normalizePdfMarginComparableText(entry.line),
        zone: 'bottom',
      }),
    ),
  ];
}

export function filterPdfMarginNoise(pages: string[][]) {
  if (!pages.length) {
    return [];
  }

  const candidatePages = new Map<string, Set<number>>();

  pages.forEach((lines, pageIndex) => {
    collectPdfMarginCandidates(lines).forEach((candidate) => {
      if (!candidate.comparable || isStandalonePageNumberLine(candidate.line)) {
        return;
      }

      const key = `${candidate.zone}:${candidate.comparable}`;
      const pageSet = candidatePages.get(key) ?? new Set<number>();
      pageSet.add(pageIndex);
      candidatePages.set(key, pageSet);
    });
  });

  const removableComparables = new Set<string>();
  for (const [key, pageSet] of candidatePages.entries()) {
    if (pageSet.size >= 2 && pageSet.size / pages.length >= 0.5) {
      removableComparables.add(key);
    }
  }

  return pages.map((lines) => {
    const marginCandidates = collectPdfMarginCandidates(lines);
    const removableLineIndexes = new Set<number>();

    marginCandidates.forEach((candidate) => {
      if (isStandalonePageNumberLine(candidate.line)) {
        removableLineIndexes.add(candidate.index);
        return;
      }

      const key = `${candidate.zone}:${candidate.comparable}`;
      if (candidate.comparable && removableComparables.has(key)) {
        removableLineIndexes.add(candidate.index);
      }
    });

    return lines.filter((_line, index) => !removableLineIndexes.has(index));
  });
}

function assertTutorTextUsable(text: string) {
  if (countMeaningfulChars(text) < MINIMUM_USABLE_TUTOR_TEXT_CHARS) {
    throw new Error(getExtractionCopy().noUsableText);
  }
}

export function cleanDocxExtractedText(text: string) {
  const cleaned = cleanTutorExtractedText(text);
  assertTutorTextUsable(cleaned);
  return cleaned;
}

export function cleanPdfExtractedPages(pages: string[][]) {
  const filteredPages = filterPdfMarginNoise(pages);
  const cleaned = cleanTutorExtractedText(filteredPages.flat().join('\n'));
  assertTutorTextUsable(cleaned);
  return cleaned;
}

async function extractPdfText(file: File) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data }).promise;
  const pages: string[][] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item): item is PdfTextItem => isPdfTextItem(item));
    pages.push(reconstructPdfPageLines(items));
  }

  return cleanPdfExtractedPages(pages);
}

async function extractDocxText(file: File) {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return cleanDocxExtractedText(value ?? '');
}

export async function extractTutorDocumentText(file: File) {
  const kind = classifyTutorUpload(file);
  const copy = getExtractionCopy();

  if (kind === 'ppt') {
    throw new Error(copy.unsupportedPpt);
  }

  if (kind === 'doc') {
    throw new Error(copy.unsupportedDoc);
  }

  if (kind === 'unsupported') {
    throw new Error(copy.unsupportedFile);
  }

  const text = kind === 'pdf' ? await extractPdfText(file) : await extractDocxText(file);

  return {
    text,
    mimeType: file.type.trim() || (kind === 'pdf' ? 'application/pdf' : DOCX_DEFAULT_MIME_TYPE),
    kind,
  };
}
