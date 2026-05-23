import {
  buildAttachmentContext,
  modelSupportsVision,
  processAttachments,
} from "./attachments";
import type { ChatAttachment, MessageContentPart, TutorProviderSettings } from "./types";

type CopilotSource = {
  type?: string;
  value?: string;
  mimeType?: string;
};

type CopilotContentPart = {
  type?: string;
  text?: string;
  source?: CopilotSource;
  metadata?: {
    filename?: string;
    [key: string]: unknown;
  };
};

type CopilotMessage = {
  id?: string;
  role?: string;
  content?: string | CopilotContentPart[];
  [key: string]: unknown;
};

function mimeTypeFor(filename: string, fallback = "") {
  if (fallback) return fallback;
  const ext = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "md" || ext === "markdown") return "text/markdown";
  if (ext === "txt") return "text/plain";
  return "application/octet-stream";
}

function sizeFromBase64(value: string) {
  const cleaned = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  return Buffer.from(cleaned, "base64").length;
}

function attachmentFromPart(part: CopilotContentPart, index: number): ChatAttachment | null {
  const source = part.source;
  if (source?.type !== "data" || !source.value) return null;

  const name = part.metadata?.filename || `attachment-${index + 1}`;
  const mimeType = mimeTypeFor(name, source.mimeType);
  const type = part.type === "image" || mimeType.startsWith("image/") ? "image" : "document";

  return {
    id: `${name}-${index}`,
    name,
    type,
    mimeType,
    size: sizeFromBase64(source.value),
    base64Text: source.value,
  };
}

function extractPlainText(content: string | CopilotContentPart[] | undefined) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text")
    .map((part) => part.text ?? "")
    .filter(Boolean)
    .join("\n");
}

export async function normalizeCopilotMessagesWithAttachments(
  messages: CopilotMessage[] = [],
  settings: TutorProviderSettings = {},
) {
  const normalized: CopilotMessage[] = [];

  for (const message of messages) {
    if (message?.role === "reasoning" || message?.role === "activity") continue;

    const role = message?.role === "developer" ? "system" : message?.role;
    const nextMessage = role === message?.role ? { ...message } : { ...message, role };
    const content = message?.content;

    if (!Array.isArray(content)) {
      normalized.push(nextMessage);
      continue;
    }

    const attachments = content
      .map((part, index) => attachmentFromPart(part, index))
      .filter((attachment): attachment is ChatAttachment => attachment !== null);

    if (attachments.length === 0) {
      normalized.push(nextMessage);
      continue;
    }

    const hasImage = attachments.some((attachment) => attachment.type === "image");
    if (hasImage && !modelSupportsVision(settings)) {
      throw new Error("The selected model does not appear to support image input. Switch to a vision-capable model and retry.");
    }

    const processed = await processAttachments(attachments, settings);
    const context = buildAttachmentContext(processed);
    const text = extractPlainText(content);
    const images = processed.filter((attachment) => attachment.kind === "image");
    const textPart = context ? `${context}\n\nLearner message:\n${text}` : text;

    const parts: MessageContentPart[] = [
      { type: "text", text: textPart },
      ...images.map((image) => ({
        type: "image_url" as const,
        image_url: { url: image.dataUrl },
      })),
    ];

    normalized.push({ ...nextMessage, content: parts });
  }

  return normalized;
}
