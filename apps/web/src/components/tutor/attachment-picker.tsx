"use client";

import { useRef, useState } from "react";
import type { AttachmentMetadata, ChatAttachment } from "@/lib/agent-os";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
].join(",");

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function kindForFile(file: File): ChatAttachment["type"] | null {
  if (file.type.startsWith("image/")) return "image";
  if (
    file.type === "application/pdf" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type.startsWith("text/") ||
    /\.(txt|md|markdown|pdf|docx)$/i.test(file.name)
  ) {
    return "document";
  }
  return null;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? value.slice(value.indexOf(",") + 1) : value);
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export function attachmentMetadata(attachment: ChatAttachment): AttachmentMetadata {
  const { id, name, type, mimeType, size } = attachment;
  return { id, name, type, mimeType, size };
}

export function AttachmentChips({
  attachments,
  onRemove,
}: {
  attachments: AttachmentMetadata[];
  onRemove?: (id: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="attachment-chips" aria-label="Attachments">
      {attachments.map((attachment) => (
        <span className="attachment-chip" key={attachment.id} title={attachment.name}>
          <span className="attachment-kind">{attachment.type === "image" ? "IMG" : "DOC"}</span>
          <span className="attachment-name">{attachment.name}</span>
          <span className="attachment-size">{Math.max(1, Math.round(attachment.size / 1024))} KB</span>
          {onRemove ? (
            <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => onRemove(attachment.id)}>
              x
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function AttachmentPicker({
  attachments,
  onChange,
  disabled = false,
  compact = false,
}: {
  attachments: ChatAttachment[];
  onChange: (attachments: ChatAttachment[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");

    const next = [...attachments];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_FILES) {
        setError(`最多一次附加 ${MAX_FILES} 个文件。`);
        break;
      }
      const type = kindForFile(file);
      if (!type) {
        setError(`不支持的文件类型：${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`文件超过 10 MB：${file.name}`);
        continue;
      }
      const base64Text = await readFileAsBase64(file);
      next.push({
        id: crypto.randomUUID(),
        name: file.name,
        type,
        mimeType: file.type || (type === "image" ? "application/octet-stream" : "text/plain"),
        size: file.size,
        base64Text,
      });
    }

    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={compact ? "attachment-picker compact" : "attachment-picker"}>
      <AttachmentChips
        attachments={attachments.map(attachmentMetadata)}
        onRemove={(id) => onChange(attachments.filter((attachment) => attachment.id !== id))}
      />
      {error ? <p className="attachment-error">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        disabled={disabled}
        onChange={(event) => void addFiles(event.target.files)}
      />
      <button
        type="button"
        className="attach-btn"
        disabled={disabled}
        aria-label="Attach files"
        title="Attach files"
        onClick={() => inputRef.current?.click()}
      >
        +
      </button>
    </div>
  );
}
