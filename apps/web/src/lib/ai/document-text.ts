// Server-side text extraction shared by one-shot chat attachments and the
// persistent learning-material library. Parsers load lazily so routes that
// never see a document never pay for pdf.js or mammoth.

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type PdfText = {
  text: string;
  pages: { num: number; text: string }[];
};

function pdfWorkerUrl() {
  return new URL("./pdf.worker.mjs", import.meta.resolve("pdf-parse")).toString();
}

export async function extractPdfText(buffer: Buffer): Promise<PdfText> {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pdfWorkerUrl());
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    return {
      text: parsed.text ?? "",
      pages: (parsed.pages ?? []).map((page) => ({ num: page.num, text: page.text ?? "" })),
    };
  } finally {
    await parser.destroy();
  }
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const parsed = await mammoth.extractRawText({ buffer });
  return parsed.value ?? "";
}

export function fileExtension(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}
