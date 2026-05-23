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
  type CopilotChatViewProps,
  type CopilotChatReasoningMessageProps,
} from "@copilotkit/react-core/v2";
import { usePrimoriaGenerativeUI, sanitizeCopilotAssistantText } from "@/hooks/use-primoria-copilot";
import { ensureThreadSummary, getCurrentThreadId, hydrateThreadHistoryFromServer, hydrateThreadMessagesFromServer, persistThreadMessageToServer, persistThreadSummaryToServer, resetCopilotThreads, THREAD_EVENT_NAME } from "@/lib/copilot-thread-history";

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

const RestoringCopilotChatView = Object.assign(
  function RestoringCopilotChatView(props: CopilotChatViewProps & { primoriaThreadId?: string }) {
  const { primoriaThreadId, ...chatProps } = props;
  const { agent } = useAgent({ agentId: "primoria_tutor", threadId: primoriaThreadId, updates: [UseAgentUpdate.OnMessagesChanged] });
  const restoredThreadRef = useRef<string | null>(null);

  useEffect(() => {
    const threadId = primoriaThreadId;
    if (!threadId) return;
    const resolvedThreadId = threadId;
    let cancelled = false;
    async function restore() {
      if (restoredThreadRef.current === resolvedThreadId) return;
      restoredThreadRef.current = resolvedThreadId;
      if (agent.messages.length > 0) return;
      const stored = await hydrateThreadMessagesFromServer(resolvedThreadId);
      if (cancelled || stored.length === 0 || agent.messages.length > 0) return;
      const messages = stored
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          id: message.id,
          role: message.role as "user" | "assistant",
          content: message.content,
        }));
      if (messages.length > 0) agent.setMessages(messages);
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [agent, primoriaThreadId]);

  return <CopilotChatView {...chatProps} />;
  },
  CopilotChatView,
);

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

  useEffect(() => {
    void hydrateThreadHistoryFromServer().finally(() => setThreadId(getCurrentThreadId()));
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
    <div className="copilot-chat-shell" aria-busy="false">
      <CopilotThreadHistoryRecorder key={`history-${threadId}`} threadId={threadId} />
      <CopilotChat
        key={`chat-${threadId}`}
        threadId={threadId}
        messageView={PrimoriaMessageView}
        chatView={((props: CopilotChatViewProps) => <RestoringCopilotChatView {...props} primoriaThreadId={threadId} />) as any}
        labels={{
          chatInputPlaceholder: "Ask anything, or ask for an interactive visualization…",
        }}
      />
    </div>
  );
}
