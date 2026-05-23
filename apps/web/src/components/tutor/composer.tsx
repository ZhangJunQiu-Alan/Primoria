"use client";

import { useState } from "react";
import type { ChatAttachment } from "@/lib/ai/types";
import { AttachmentPicker } from "./attachment-picker";

type TutorComposerProps = {
  onSend: (message: string, attachments: ChatAttachment[]) => void | Promise<void>;
  disabled?: boolean;
};

export function TutorComposer({ onSend, disabled = false }: TutorComposerProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  return (
    <div className="composer-wrap">
      <AttachmentPicker attachments={attachments} onChange={setAttachments} disabled={disabled} />
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          const message = value;
          const files = attachments;
          if (!message.trim() && files.length === 0) return;
          setValue("");
          setAttachments([]);
          void onSend(message, files);
        }}
      >
        <input
          aria-label="Tutor prompt"
          placeholder="Ask anything, or ask for an interactive visualization..."
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
        />
        <button className="send" aria-label="Send" disabled={disabled || (!value.trim() && attachments.length === 0)}>
          ›
        </button>
      </form>
    </div>
  );
}
