"use client";

import { useEffect, useRef, useState } from "react";
import {
  CopilotChat,
  CopilotChatAssistantMessage,
  CopilotChatMessageView,
  CopilotChatView,
  CopilotChatReasoningMessage,
  UseAgentUpdate,
  useAgent,
  type CopilotChatAssistantMessageProps,
  type CopilotChatMessageViewProps,
  type CopilotChatReasoningMessageProps,
} from "@copilotkit/react-core/v2";
import { usePrimoriaGenerativeUI, sanitizeCopilotAssistantText } from "@/hooks/use-primoria-copilot";
import { ensureThreadSummary, getCurrentThreadId, hydrateThreadHistoryFromServer, hydrateThreadMessagesFromServer, persistThreadMessageToServer, persistThreadSummaryToServer, resetCopilotThreads, THREAD_EVENT_NAME } from "@/lib/copilot-thread-history";

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
  CopilotChatView,
);

function messageText(message: { content?: unknown }) {
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text ?? "");
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

function CopilotThreadHistoryRecorder({ threadId }: { threadId: string }) {
  const { agent } = useAgent({ agentId: "primoria_tutor", threadId, updates: [UseAgentUpdate.OnMessagesChanged] });
  const recordedMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const initial = ensureThreadSummary(threadId);
    void persistThreadSummaryToServer(initial);
  }, [threadId]);

  useEffect(() => {
    const userMessages = agent.messages.filter((message) => message.role === "user");
    const lastUser = userMessages[userMessages.length - 1];
    const lastUserText = messageText(lastUser ?? {}).trim();
    const summary = ensureThreadSummary(threadId, {
      title: lastUserText ? lastUserText.slice(0, 48) : undefined,
      preview: lastUserText ? lastUserText.slice(0, 90) : undefined,
      messageCount: agent.messages.length,
      updatedAt: Date.now(),
    });
    void persistThreadSummaryToServer(summary);

    for (const message of agent.messages) {
      const id = message.id ?? `${message.role}-${messageText(message).slice(0, 32)}`;
      if (recordedMessagesRef.current.has(id)) continue;
      const content = messageText(message).trim();
      if (!content) continue;
      recordedMessagesRef.current.add(id);
      void persistThreadMessageToServer(threadId, {
        id,
        role: message.role,
        content,
        metadata: { source: "copilotkit" },
        createdAt: Date.now(),
      });
    }
  }, [agent.messages, threadId]);

  return null;
}

function useCurrentCopilotThreadId() {
  const [threadId, setThreadId] = useState(() => getCurrentThreadId());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateThreadHistoryFromServer().finally(() => {
      if (cancelled) return;
      setThreadId(getCurrentThreadId());
      setIsReady(true);
    });
    function onThreadChanged() {
      setThreadId(getCurrentThreadId());
      setIsReady(true);
    }
    window.addEventListener(THREAD_EVENT_NAME, onThreadChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(THREAD_EVENT_NAME, onThreadChanged);
    };
  }, []);

  return { threadId, isReady };
}

function CopilotRestorePanel() {
  return (
    <div className="copilot-restore-panel" aria-live="polite">
      <span className="copilot-restore-dot" />
      <span>Restoring your conversation…</span>
    </div>
  );
}

function RestoredCopilotChat({ threadId }: { threadId: string }) {
  const { agent } = useAgent({ agentId: "primoria_tutor", threadId, updates: [UseAgentUpdate.OnMessagesChanged] });
  const [attachmentError, setAttachmentError] = useState("");
  const [restoration, setRestoration] = useState<{
    threadId: string;
    agent: typeof agent;
    done: boolean;
  }>(() => ({
    threadId,
    agent,
    done: agent.messages.length > 0,
  }));

  useEffect(() => {
    const resolvedThreadId = threadId;
    let cancelled = false;

    async function restore() {
      if (agent.messages.length > 0) {
        setRestoration({ threadId: resolvedThreadId, agent, done: true });
        return;
      }

      const stored = await hydrateThreadMessagesFromServer(resolvedThreadId);
      if (cancelled) return;

      const messages = stored
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          id: message.id,
          role: message.role as "user" | "assistant",
          content: message.content,
        }));

      if (messages.length > 0 && agent.messages.length === 0) agent.setMessages(messages as any);
      setRestoration({ threadId: resolvedThreadId, agent, done: true });
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [agent, threadId]);

  const restoredForCurrentAgent =
    agent.messages.length > 0 || (restoration.done && restoration.threadId === threadId && restoration.agent === agent);

  if (!restoredForCurrentAgent) return <CopilotRestorePanel />;

  return (
    <>
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
    </>
  );
}

export function TutorChatCopilot() {
  usePrimoriaGenerativeUI();
  const { threadId, isReady } = useCurrentCopilotThreadId();

  useEffect(() => {
    function onCopilotRunError(event: ErrorEvent) {
      const message = String(event.message || "");
      if (/Message not found|INCOMPLETE_STREAM|already errored/i.test(message)) {
        resetCopilotThreads();
      }
    }
    window.addEventListener("error", onCopilotRunError);
    return () => window.removeEventListener("error", onCopilotRunError);
  }, []);

  return (
    <div className="copilot-chat-shell" aria-busy={!isReady}>
      {isReady ? <RestoredCopilotChat key={`restore-${threadId}`} threadId={threadId} /> : <CopilotRestorePanel />}
    </div>
  );
}
