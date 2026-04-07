import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

export type TutorUploadKind = 'pdf' | 'docx' | 'ppt' | 'doc' | 'unsupported';

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

function normalizeExtractedText(text: string) {
  return text
    .replaceAll('\u0000', '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

async function extractPdfText(file: File) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data }).promise;
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => {
        if (item && typeof item === 'object' && 'str' in item && typeof item.str === 'string') {
          return item.str;
        }
        return '';
      })
      .join(' ')
      .trim();

    if (text) {
      chunks.push(text);
    }
  }

  return normalizeExtractedText(chunks.join('\n\n'));
}

async function extractDocxText(file: File) {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return normalizeExtractedText(value ?? '');
}

export async function extractTutorDocumentText(file: File) {
  const kind = classifyTutorUpload(file);

  if (kind === 'ppt') {
    throw new Error('PPT/PPTX 暂不支持直接解析，请先导出为 PDF 再上传。');
  }

  if (kind === 'doc') {
    throw new Error('DOC 暂不支持直接解析，请另存为 DOCX 或 PDF 后再上传。');
  }

  if (kind === 'unsupported') {
    throw new Error('暂不支持这种文件类型，请上传 PDF 或 DOCX。');
  }

  const text = kind === 'pdf' ? await extractPdfText(file) : await extractDocxText(file);
  if (!text) {
    throw new Error('无法从该资料中提取可用文本。');
  }

  return {
    text,
    mimeType: file.type.trim() || (kind === 'pdf' ? 'application/pdf' : DOCX_DEFAULT_MIME_TYPE),
    kind,
  };
}
