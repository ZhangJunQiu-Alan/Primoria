import { createHash } from "node:crypto";

import { extractDocxText, extractPdfText } from "../ai/document-text";
import { chunkMaterial, detectMaterialLanguage, type MaterialChunk, type MaterialSegment } from "./chunking";
import {
  MATERIAL_MIME_BY_FORMAT,
  MAX_MATERIAL_CHARS,
  MAX_MATERIAL_FILE_BYTES,
  MIN_MATERIAL_CHARS,
  materialFormatFor,
  materialTitleFromFileName,
  type MaterialFormat,
} from "./limits";

// Upload ingestion: validate → extract text → chunk. Pure apart from the
// document parsers; persistence lives in store.ts. Every rejection is a
// MaterialInputError with a stable code the route maps to a safe response —
// parser messages never reach the client.

export type MaterialInputErrorCode =
  | "unsupported_type"
  | "file_too_large"
  | "empty_file"
  | "parse_failed"
  | "no_text"
  | "too_short"
  | "too_long";

export class MaterialInputError extends Error {
  constructor(public readonly code: MaterialInputErrorCode, message: string) {
    super(message);
    this.name = "MaterialInputError";
  }
}

export type PreparedMaterial = {
  title: string;
  fileName: string;
  mimeType: string;
  format: MaterialFormat;
  byteLength: number;
  contentSha256: string;
  charCount: number;
  pageCount: number | null;
  language: "zh" | "en";
  chunks: MaterialChunk[];
};

export type ExtractSegments = (format: MaterialFormat, buffer: Buffer) => Promise<{ segments: MaterialSegment[]; pageCount: number | null }>;

export const extractMaterialSegments: ExtractSegments = async (format, buffer) => {
  if (format === "pdf") {
    const { text, pages } = await extractPdfText(buffer);
    if (pages.length > 0) {
      return { segments: pages.map((page) => ({ text: page.text, page: page.num })), pageCount: pages.length };
    }
    return { segments: [{ text, page: null }], pageCount: null };
  }
  if (format === "docx") return { segments: [{ text: await extractDocxText(buffer), page: null }], pageCount: null };
  return { segments: [{ text: buffer.toString("utf8"), page: null }], pageCount: null };
};

/** Same-owner dedupe key: SHA-256 of the uploaded bytes. */
export function materialDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function prepareMaterial(
  input: { fileName: string; mimeType: string | null; bytes: Uint8Array },
  extract: ExtractSegments = extractMaterialSegments,
): Promise<PreparedMaterial> {
  const fileName = input.fileName.trim().slice(0, 255) || "material";
  const format = materialFormatFor(fileName, input.mimeType);
  if (!format) throw new MaterialInputError("unsupported_type", "Only PDF, DOCX, Markdown, and plain-text files are supported.");
  if (input.bytes.byteLength === 0) throw new MaterialInputError("empty_file", "The file is empty.");
  if (input.bytes.byteLength > MAX_MATERIAL_FILE_BYTES) {
    throw new MaterialInputError("file_too_large", "The file is larger than the 8 MB limit.");
  }

  const buffer = Buffer.from(input.bytes);
  let extracted: Awaited<ReturnType<ExtractSegments>>;
  try {
    extracted = await extract(format, buffer);
  } catch (error) {
    console.warn("[materials] text extraction failed:", error instanceof Error ? error.message : error);
    throw new MaterialInputError("parse_failed", "The file could not be processed. Please retry or upload another copy.");
  }

  const chunks = chunkMaterial(extracted.segments);
  const charCount = chunks.reduce((total, chunk) => total + chunk.charCount, 0);
  if (charCount === 0) {
    throw new MaterialInputError("no_text", "No extractable text was found. Scanned documents and images are not supported yet.");
  }
  if (charCount < MIN_MATERIAL_CHARS) {
    throw new MaterialInputError("too_short", "The material is too short to build a course from.");
  }
  if (charCount > MAX_MATERIAL_CHARS) {
    throw new MaterialInputError("too_long", "The material is longer than the 400,000-character limit. Split it into smaller files.");
  }

  return {
    title: materialTitleFromFileName(fileName),
    fileName,
    mimeType: MATERIAL_MIME_BY_FORMAT[format],
    format,
    byteLength: input.bytes.byteLength,
    contentSha256: materialDigest(input.bytes),
    charCount,
    pageCount: extracted.pageCount,
    language: detectMaterialLanguage(chunks.map((chunk) => chunk.text).join("\n")),
    chunks,
  };
}
