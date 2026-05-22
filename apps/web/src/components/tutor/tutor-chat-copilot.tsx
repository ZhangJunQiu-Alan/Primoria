"use client";

import { useEffect, useRef } from "react";
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
import { ensureThreadSummary, getCurrentThreadId } from "@/lib/copilot-thread-history";

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


function CopilotThreadHistoryRecorder() {
  const threadId = getCurrentThreadId();
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

export function TutorChatCopilot() {
  usePrimoriaGenerativeUI();

  return (
    <div className="copilot-chat-shell">
      <CopilotThreadHistoryRecorder />
      <CopilotChat
        messageView={PrimoriaMessageView}
        labels={{
          chatInputPlaceholder: "Ask anything, or ask for an interactive visualization…",
        }}
      />
    </div>
  );
}
