import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  AttachmentMetadata,
  ChatAttachment,
  MessageContentPart,
  TutorProviderSettings,
} from "./types";
import { resolveProviderSettings } from "./deepagent/model";

export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_CHARS_PER_DOCUMENT = 12_000;
const MAX_TOTAL_DOCUMENT_CHARS = 30_000;

export const ACCEPTED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
] as const;

export const ACCEPTED_ATTACHMENT_INPUT = [
  ...ACCEPTED_ATTACHMENT_TYPES,
  ".txt",
  ".md",
  ".markdown",
  ".pdf",
  ".docx",
].join(",");

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

export const AttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["image", "document"]),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  base64Text: z.string().min(1),
});

export const AttachmentsSchema = z.array(AttachmentSchema).max(MAX_ATTACHMENT_COUNT).optional();

export type ProcessedAttachment =
  | (AttachmentMetadata & {
      kind: "image";
      dataUrl: string;
    })
  | (AttachmentMetadata & {
      kind: "document";
      text: string;
      truncated: boolean;
    });

function isSupportedAttachment(attachment: ChatAttachment) {
  if (attachment.type === "image") return IMAGE_MIME_TYPES.has(attachment.mimeType);
  return DOCUMENT_MIME_TYPES.has(attachment.mimeType);
}

function extensionFor(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function bufferFromBase64(attachment: ChatAttachment) {
  return Buffer.from(cleanBase64Text(attachment.base64Text), "base64");
}

function cleanBase64Text(value: string) {
  return value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
}

function pdfWorkerUrl() {
  const roots = [process.cwd(), path.join(process.cwd(), ".."), path.join(process.cwd(), "../..")];
  const candidates = roots.flatMap((root) => [
    path.join(root, "node_modules/pdf-parse/dist/worker/pdf.worker.mjs"),
    path.join(root, "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs"),
    ...pnpmPdfWorkerCandidates(root),
  ]);
  const workerPath = candidates.find((candidate) => fs.existsSync(candidate));
  return workerPath ? pathToFileURL(workerPath).toString() : undefined;
}

function pnpmPdfWorkerCandidates(root: string) {
  const pnpmDir = path.join(root, "node_modules/.pnpm");
  if (!fs.existsSync(pnpmDir)) return [];

  return fs
    .readdirSync(pnpmDir)
    .filter((entry) => entry.startsWith("pdf-parse@"))
    .flatMap((entry) => {
      const packageRoot = path.join(pnpmDir, entry, "node_modules/pdf-parse");
      return [
        path.join(packageRoot, "dist/worker/pdf.worker.mjs"),
        path.join(packageRoot, "dist/pdf-parse/esm/pdf.worker.mjs"),
      ];
    });
}

async function extractDocumentText(attachment: ChatAttachment, buffer: Buffer) {
  const ext = extensionFor(attachment.name);

  if (attachment.mimeType.startsWith("text/") || ext === "txt" || ext === "md" || ext === "markdown") {
    return buffer.toString("utf8");
  }

  if (attachment.mimeType === "application/pdf" || ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    PDFParse.setWorker(pdfWorkerUrl());
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parsed.text ?? "";
    } finally {
      await parser.destroy();
    }
  }

  if (
    attachment.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value ?? "";
  }

  return "";
}

function enforceAttachmentLimits(attachments: ChatAttachment[]) {
  if (attachments.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`You can attach up to ${MAX_ATTACHMENT_COUNT} files at once.`);
  }

  let totalBytes = 0;
  for (const attachment of attachments) {
    if (!isSupportedAttachment(attachment)) {
      throw new Error(`Unsupported attachment type: ${attachment.name}`);
    }
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`"${attachment.name}" is larger than the 10 MB per-file limit.`);
    }
    totalBytes += attachment.size;
  }

  if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    throw new Error("Attachments are larger than the 20 MB per-message limit.");
  }
}

export function attachmentMetadata(attachment: ChatAttachment): AttachmentMetadata {
  const { id, name, type, mimeType, size } = attachment;
  return { id, name, type, mimeType, size };
}

export function modelSupportsVision(settings: TutorProviderSettings = {}) {
  const resolved = resolveProviderSettings(settings);
  const model = resolved.model.toLowerCase();
  return /gpt-4o|gpt-4\.1|gpt-5|o3|o4|gemini|claude-3|claude-4|qwen.*vl|vision|llava|pixtral/.test(model);
}

export async function processAttachments(
  attachments: ChatAttachment[] = [],
  settings: TutorProviderSettings = {},
): Promise<ProcessedAttachment[]> {
  if (attachments.length === 0) return [];
  enforceAttachmentLimits(attachments);

  const hasImage = attachments.some((attachment) => attachment.type === "image");
  if (hasImage && !modelSupportsVision(settings)) {
    throw new Error("The selected model does not appear to support image input. Switch to a vision-capable model and retry.");
  }

  const processed: ProcessedAttachment[] = [];
  for (const attachment of attachments) {
    const buffer = bufferFromBase64(attachment);
    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      throw new Error(`"${attachment.name}" is larger than the 10 MB per-file limit.`);
    }

    if (attachment.type === "image") {
      processed.push({
        ...attachmentMetadata(attachment),
        kind: "image",
        dataUrl: `data:${attachment.mimeType};base64,${cleanBase64Text(attachment.base64Text)}`,
      });
      continue;
    }

    const text = (await extractDocumentText(attachment, buffer)).trim();
    processed.push({
      ...attachmentMetadata(attachment),
      kind: "document",
      text,
      truncated: text.length > MAX_CHARS_PER_DOCUMENT,
    });
  }

  return processed;
}

export function buildAttachmentContext(processed: ProcessedAttachment[]) {
  const documentParts: string[] = [];
  let remaining = MAX_TOTAL_DOCUMENT_CHARS;

  for (const attachment of processed) {
    if (attachment.kind !== "document") continue;
    if (remaining <= 0) break;

    const source = attachment.text || "[No extractable text was found.]";
    const clipped = source.slice(0, Math.min(MAX_CHARS_PER_DOCUMENT, remaining));
    remaining -= clipped.length;
    const truncated = attachment.truncated || clipped.length < source.length;
    documentParts.push(
      [
        `File: ${attachment.name}`,
        `MIME: ${attachment.mimeType}`,
        `Size: ${attachment.size} bytes`,
        truncated ? "Note: Content was truncated to fit the chat context." : "",
        "Extracted text:",
        clipped,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (documentParts.length === 0) return "";
  return `Uploaded document context:\n\n${documentParts.map((part, index) => `--- Attachment ${index + 1} ---\n${part}`).join("\n\n")}`;
}

export function applyAttachmentsToLatestUserMessage<T extends { role: string; content: string | MessageContentPart[] }>(
  messages: T[],
  processed: ProcessedAttachment[],
): T[] {
  if (processed.length === 0) return messages;
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  if (latestUserIndex === -1) return messages;

  const context = buildAttachmentContext(processed);
  const images = processed.filter((attachment) => attachment.kind === "image");
  const nextMessages = [...messages];
  const current = nextMessages[latestUserIndex];
  const text = typeof current.content === "string"
    ? current.content
    : current.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");

  const parts: MessageContentPart[] = [
    { type: "text", text: context ? `${context}\n\nLearner message:\n${text}` : text },
    ...images.map((image) => ({ type: "image_url" as const, image_url: { url: image.dataUrl } })),
  ];

  nextMessages[latestUserIndex] = { ...current, content: parts };
  return nextMessages;
}

export function buildCourseUserContent(message: string, attachmentContext: string, processed: ProcessedAttachment[]) {
  const text = attachmentContext ? `${attachmentContext}\n\nLearner question: ${message}` : `Learner question: ${message}`;
  const images = processed.filter((attachment) => attachment.kind === "image");
  if (images.length === 0) return text;
  return [
    { type: "text" as const, text },
    ...images.map((image) => ({ type: "image_url" as const, image_url: { url: image.dataUrl } })),
  ];
}
