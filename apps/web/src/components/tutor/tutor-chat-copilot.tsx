"use client";

import { useEffect, useRef, useState } from "react";
import {
  CopilotChat,
  CopilotChatAssistantMessage,
  CopilotChatMessageView,
  CopilotChatReasoningMessage,
  UseAgentUpdate,
  useAgent,
  type CopilotChatAssistantMessageProps,
  type CopilotChatMessageViewProps,
  type CopilotChatReasoningMessageProps,
} from "@copilotkit/react-core/v2";
import { usePrimoriaGenerativeUI, sanitizeCopilotAssistantText } from "@/hooks/use-primoria-copilot";
import { ensureThreadSummary, getCurrentThreadId, THREAD_EVENT_NAME } from "@/lib/copilot-thread-history";

const COPILOT_ACCEPTED_ATTACHMENTS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  ".txt",
  ".md",
  ".markdown",
  ".pdf",
  ".docx",
].join(",");
const MAX_COPILOT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const PrimoriaAssistantMessage = Object.assign(
  function PrimoriaAssistantMessage(props: CopilotChatAssistantMessageProps) {
    const safeContent = sanitizeCopilotAssistantText(props.message.content);
    const message = { ...props.message, content: safeContent };
    return <CopilotChatAssistantMessage {...props} message={message} />;
  },
  CopilotChatAssistantMessage,
);

const PrimoriaReasoningMessage = Object.assign(
  function PrimoriaReasoningMessage(_props: CopilotChatReasoningMessageProps) {
    return null;
  },
  CopilotChatReasoningMessage,
);

const PrimoriaMessageView = Object.assign(
  function PrimoriaMessageView(props: CopilotChatMessageViewProps) {
    return (
      <CopilotChatMessageView
        {...props}
        assistantMessage={PrimoriaAssistantMessage}
        reasoningMessage={PrimoriaReasoningMessage}
      />
    );
  },
  CopilotChatMessageView,
);


function CopilotThreadHistoryRecorder({ threadId }: { threadId: string }) {
  const { agent } = useAgent({ agentId: "primoria_tutor", threadId, updates: [UseAgentUpdate.OnMessagesChanged] });
  const lastRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    ensureThreadSummary(threadId);
    const userMessages = agent.messages.filter((message) => message.role === "user");
    const lastUser = userMessages[userMessages.length - 1];
    const content = typeof lastUser?.content === "string"
      ? lastUser.content
      : Array.isArray(lastUser?.content)
        ? String((lastUser.content.find((part) => part?.type === "text") as { text?: string } | undefined)?.text ?? "")
        : "";
    const trimmed = content.trim();
    if (!trimmed || lastRecordedRef.current === lastUser?.id) return;
    lastRecordedRef.current = lastUser?.id ?? trimmed;
    ensureThreadSummary(threadId, {
      title: trimmed.slice(0, 48),
      preview: trimmed.slice(0, 90),
      messageCount: userMessages.length,
      updatedAt: Date.now(),
    });
  }, [agent.messages, threadId]);

  return null;
}

function useCurrentCopilotThreadId() {
  const [threadId, setThreadId] = useState(() => getCurrentThreadId());

  useEffect(() => {
    function onThreadChanged() {
      setThreadId(getCurrentThreadId());
    }
    window.addEventListener(THREAD_EVENT_NAME, onThreadChanged);
    return () => window.removeEventListener(THREAD_EVENT_NAME, onThreadChanged);
  }, []);

  return threadId;
}

export function TutorChatCopilot() {
  usePrimoriaGenerativeUI();
  const threadId = useCurrentCopilotThreadId();
  const [attachmentError, setAttachmentError] = useState("");

  return (
    <div className="copilot-chat-shell" aria-busy="false">
      <CopilotThreadHistoryRecorder key={`history-${threadId}`} threadId={threadId} />
      {attachmentError ? <p className="attachment-error copilot-attachment-error">{attachmentError}</p> : null}
      <CopilotChat
        key={`chat-${threadId}`}
        threadId={threadId}
        messageView={PrimoriaMessageView}
        attachments={{
          enabled: true,
          accept: COPILOT_ACCEPTED_ATTACHMENTS,
          maxSize: MAX_COPILOT_ATTACHMENT_BYTES,
          onUpload: async (file) => {
            setAttachmentError("");
            const value = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = String(reader.result ?? "");
                resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
              };
              reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
              reader.readAsDataURL(file);
            });
            return {
              type: "data",
              value,
              mimeType: file.type,
            };
          },
          onUploadFailed: ({ message }) => setAttachmentError(message),
        }}
        onError={(event) => {
          if ("error" in event) {
            setAttachmentError(event.error instanceof Error ? event.error.message : String(event.error));
          }
        }}
        labels={{
          chatInputPlaceholder: "Ask anything, or ask for an interactive visualization…",
          chatInputToolbarAddButtonLabel: "Attach files",
        }}
      />
    </div>
  );
}
