// Learning-material limits (docs/product/learning-materials.md §6). Pure and
// client-safe so the upload UI can reject a file before sending it — keep
// server-only imports (document parsers) out of this module.

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// proxy.ts buffers request bodies up to Next's 10 MB proxyClientMaxBodySize and
// silently truncates beyond it, so one multipart file must stay well below that.
export const MAX_MATERIAL_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_MATERIAL_CHARS = 400_000;
export const MIN_MATERIAL_CHARS = 200;
export const MAX_MATERIALS_PER_OWNER = 50;
export const MAX_MATERIALS_PER_COURSE = 5;
export const MAX_COURSE_SOURCE_CHARS = 600_000;
export const MAX_MATERIAL_TITLE_CHARS = 120;

export type MaterialFormat = "pdf" | "docx" | "markdown" | "text";

const FORMAT_BY_EXTENSION: Record<string, MaterialFormat> = {
  pdf: "pdf",
  docx: "docx",
  md: "markdown",
  markdown: "markdown",
  txt: "text",
};

const FORMAT_BY_MIME: Record<string, MaterialFormat> = {
  "application/pdf": "pdf",
  [DOCX_MIME_TYPE]: "docx",
  "text/markdown": "markdown",
  "text/x-markdown": "markdown",
  "text/plain": "text",
};

export const MATERIAL_MIME_BY_FORMAT: Record<MaterialFormat, string> = {
  pdf: "application/pdf",
  docx: DOCX_MIME_TYPE,
  markdown: "text/markdown",
  text: "text/plain",
};

export const ACCEPTED_MATERIAL_INPUT = [".pdf", ".docx", ".md", ".markdown", ".txt", ...Object.keys(FORMAT_BY_MIME)].join(",");

/** The extension wins over the browser-reported MIME type: browsers report
 * Markdown and some DOCX files as "" or application/octet-stream. */
export function materialFormatFor(fileName: string, mimeType: string | null | undefined): MaterialFormat | null {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  return FORMAT_BY_EXTENSION[ext] ?? FORMAT_BY_MIME[(mimeType ?? "").toLowerCase()] ?? null;
}

/** Display title from a file name: extension dropped, whitespace collapsed. */
export function materialTitleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_\s]+/g, " ").trim();
  return (base || fileName).slice(0, MAX_MATERIAL_TITLE_CHARS);
}
