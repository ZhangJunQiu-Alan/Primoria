"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CopilotChat,
  CopilotChatAssistantMessage,
  CopilotChatMessageView,
  CopilotChatUserMessage,
  CopilotChatInput,
  CopilotChatSuggestionView,
  CopilotChatView,
  CopilotChatAttachmentQueue,
  useAgentContext,
  CopilotChatReasoningMessage,
  CopilotChatToolCallsView,
  UseAgentUpdate,
  useConfigureSuggestions,
  useAgent,
  type CopilotChatAssistantMessageProps,
  type CopilotChatMessageViewProps,
  type CopilotChatInputProps,
  type CopilotChatReasoningMessageProps,
  type CopilotChatSuggestionViewProps,
  type CopilotChatUserMessageProps,
  type CopilotChatViewProps,
} from "@copilotkit/react-core/v2";
import { CourseMarkdown } from "@/components/course/course-markdown";
import { sanitizeCopilotAssistantText } from "@/hooks/use-primoria-copilot";
import {
  ensureThreadSummary,
  hydrateThreadMessagesFromServer,
  persistThreadMessageToServer,
  persistThreadSummaryToServer,
} from "@/lib/copilot-thread-history";

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

const PrimoriaUserMessage = Object.assign(
  function PrimoriaUserMessage({
    message,
    className,
    onEditMessage: _onEditMessage,
    onSwitchToBranch: _onSwitchToBranch,
    branchIndex: _branchIndex,
    numberOfBranches: _numberOfBranches,
    additionalToolbarItems: _additionalToolbarItems,
    messageRenderer: _messageRenderer,
    toolbar: _toolbar,
    copyButton: _copyButton,
    editButton: _editButton,
    branchNavigation: _branchNavigation,
    children: _children,
    ...props
  }: CopilotChatUserMessageProps) {
    const text = stripInjectedCourseContext(message.content).trim();
    const attachments = userAttachmentLabels(message.content);
    if (!text && attachments.length === 0) return null;

    return (
      <div
        data-testid="copilot-user-message"
        data-message-id={message.id}
        className={["primoria-copilot-message", "primoria-copilot-user-message", className].filter(Boolean).join(" ")}
        {...props}
      >
        <div className="primoria-copilot-bubble primoria-copilot-user-bubble">
          {text ? <span>{text}</span> : null}
          {attachments.length > 0 ? (
            <div className="primoria-copilot-attachments">
              {attachments.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
  CopilotChatUserMessage,
);

const PrimoriaAssistantMessage = Object.assign(
  function PrimoriaAssistantMessage({
    message,
    messages,
    isRunning,
    className,
    onThumbsUp: _onThumbsUp,
    onThumbsDown: _onThumbsDown,
    onReadAloud: _onReadAloud,
    onRegenerate: _onRegenerate,
    additionalToolbarItems: _additionalToolbarItems,
    toolbarVisible: _toolbarVisible,
    markdownRenderer: _markdownRenderer,
    toolbar: _toolbar,
    copyButton: _copyButton,
    thumbsUpButton: _thumbsUpButton,
    thumbsDownButton: _thumbsDownButton,
    readAloudButton: _readAloudButton,
    regenerateButton: _regenerateButton,
    toolCallsView: _toolCallsView,
    children: _children,
    ...props
  }: CopilotChatAssistantMessageProps) {
      const safeContent = sanitizeCopilotAssistantText(message.content);
    const visibleContent = useProgressiveAssistantText(safeContent, Boolean(isRunning));
    const safeMessage = { ...message, content: safeContent };
    const hasText = visibleContent.trim().length > 0;
    const hasTools = Boolean(message.toolCalls?.length);

    if (!hasText && !hasTools) return null;

    return (
      <div
        data-testid="copilot-assistant-message"
        data-message-id={message.id}
        data-running={isRunning || undefined}
        className={["primoria-copilot-message", "primoria-copilot-assistant-message", className].filter(Boolean).join(" ")}
        {...props}
      >
        {hasText ? (
          <div className="primoria-copilot-assistant-row">
            <div className="primoria-copilot-avatar" aria-hidden="true">
              <span />
            </div>
            <div className="primoria-copilot-bubble primoria-copilot-assistant-bubble">
              <CourseMarkdown markdown={visibleContent} />
              {isRunning ? <span className="primoria-stream-caret" aria-hidden="true" /> : null}
            </div>
          </div>
        ) : null}
        {hasTools ? (
          <div className="primoria-copilot-tools" aria-live="polite">
            <CopilotChatToolCallsView message={safeMessage} messages={messages} />
          </div>
        ) : null}
      </div>
    );
  },
  CopilotChatAssistantMessage,
);


function useProgressiveAssistantText(content: string, isRunning: boolean) {
  const [visible, setVisible] = useState(content);
  const previousContentRef = useRef(content);

  useEffect(() => {
    const previous = previousContentRef.current;
    previousContentRef.current = content;

    if (!content || !isRunning || content.length <= 16 || (content.startsWith(previous) && content.length <= previous.length + 4)) {
      const timer = window.setTimeout(() => setVisible(content), 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    let index = Math.min(previous.length && content.startsWith(previous) ? previous.length : 0, content.length);
    const startTimer = window.setTimeout(() => setVisible(content.slice(0, index)), 0);

    const tick = () => {
      if (cancelled) return;
      index = Math.min(content.length, index + Math.max(3, Math.ceil((content.length - index) / 14)));
      setVisible(content.slice(0, index));
      if (index < content.length) window.setTimeout(tick, 18);
    };

    const timer = window.setTimeout(tick, 12);
    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(timer);
    };
  }, [content, isRunning]);

  return visible;
}

const PrimoriaReasoningMessage = Object.assign(
  function PrimoriaReasoningMessage(_props: CopilotChatReasoningMessageProps) {
    return null;
  },
  CopilotChatReasoningMessage,
);

const PrimoriaChatInput = Object.assign(
  function PrimoriaChatInput(props: CopilotChatInputProps) {
    return <CopilotChatInput {...props} className="primoria-copilot-input-slot" showDisclaimer={false} />;
  },
  CopilotChatInput,
);

const PrimoriaMessageView = Object.assign(
  function PrimoriaMessageView(props: CopilotChatMessageViewProps) {
    const messages = useMemo(
      () => (props.messages ?? []).map((message) =>
        message.role === "user"
          ? { ...message, content: stripInjectedCourseContext(message.content) }
          : message,
      ),
      [props.messages],
    );

    return (
      <CopilotChatMessageView
        {...props}
        messages={messages}
        userMessage={PrimoriaUserMessage}
        assistantMessage={PrimoriaAssistantMessage}
        reasoningMessage={PrimoriaReasoningMessage}
      >
        {({ messageElements, interruptElement, isRunning }) => {
          const lastMessage = messages[messages.length - 1];
          const showCursor = isRunning && lastMessage?.role !== "reasoning";
          return (
            <div data-testid="copilot-message-list" className="primoria-copilot-thread">
              {messageElements}
              {interruptElement}
              {showCursor ? <div className="primoria-copilot-cursor" aria-hidden="true" /> : null}
            </div>
          );
        }}
      </CopilotChatMessageView>
    );
  },
  CopilotChatMessageView,
);

const PrimoriaChatView = Object.assign(
  function PrimoriaChatView({
    composerContext,
    ...props
  }: CopilotChatViewProps & { composerContext?: React.ReactNode }) {
    return (
      <CopilotChatView
        {...props}
        messageView={PrimoriaMessageView}
        input={PrimoriaChatInput}
        suggestionView={PrimoriaMainSuggestionView}
        welcomeScreen={false}
      >
        {({ messageView, input, suggestionView }) => (
          <PrimoriaChatLayout
            {...props}
            messageView={messageView}
            input={input}
            suggestionView={suggestionView}
            composerContext={composerContext}
          />
        )}
      </CopilotChatView>
    );
  },
  CopilotChatView,
);

function PrimoriaChatLayout({
  messages = [],
  isRunning,
  input,
  messageView,
  suggestionView,
  attachments,
  onRemoveAttachment,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  welcomeScreen,
  composerContext,
}: CopilotChatViewProps & {
  input: React.ReactElement;
  messageView: React.ReactElement;
  suggestionView: React.ReactElement;
  composerContext?: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];
  const scrollKey = `${messages.length}:${lastMessage?.id ?? ""}:${typeof lastMessage?.content === "string" ? lastMessage.content.length : 0}`;

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [scrollKey, isRunning]);

  const showWelcome = messages.length === 0 && welcomeScreen !== false;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  return (
    <div
      data-testid="copilot-chat"
      data-copilot-running={isRunning ? "true" : "false"}
      className="copilotKitChat primoria-copilot-chat"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragOver ? <div className="primoria-copilot-drop-overlay">Drop files here</div> : null}
      {showWelcome ? (
        <PrimoriaMainWelcomeScreen input={input} suggestionView={suggestionView} />
      ) : (
        <>
          <div ref={scrollRef} className="primoria-copilot-scroll">
            {messageView}
          </div>
          <div className="primoria-copilot-composer">
            {composerContext}
            {hasAttachments ? (
              <CopilotChatAttachmentQueue
                attachments={attachments}
                onRemoveAttachment={(id) => onRemoveAttachment?.(id)}
                className="primoria-copilot-attachment-queue"
              />
            ) : null}
            {input}
          </div>
        </>
      )}
    </div>
  );
}

const MAIN_SUGGESTIONS = [
  {
    title: "Visualize",
    message: "做一个牛顿摆能量传递的互动可视化，并一步步解释",
  },
  {
    title: "Build a course",
    message: "给我生成一门关于信息熵直觉的课程",
  },
  {
    title: "Step through",
    message: "带我一步步解开普勒第二定律的几何直觉",
  },
  {
    title: "Code",
    message: "帮我把一段 React 组件改成 useMemo 优化版本，先解释原因",
  },
];

const PrimoriaMainSuggestionView = Object.assign(
  function PrimoriaMainSuggestionView(props: CopilotChatSuggestionViewProps) {
    return <CopilotChatSuggestionView {...props} />;
  },
  CopilotChatSuggestionView,
);

function PrimoriaMainWelcomeScreen({
  input,
  suggestionView,
}: {
  input?: React.ReactNode;
  suggestionView?: React.ReactNode;
}) {
  return (
    <div data-testid="copilot-welcome-screen" className="primoria-main-welcome">
      <div className="primoria-main-welcome-card">
        <h1>What do you want to learn today?</h1>
        <p>
          Ask for a concept, a course, a visual simulation, code help, or upload a file. Primoria will turn it into an interactive learning path.
        </p>
        <div className="primoria-main-input">{input}</div>
        <div className="primoria-main-suggestions">{suggestionView}</div>
      </div>
    </div>
  );
}


function stripInjectedCourseContext(content: unknown) {
  const text = contentToText(content);
  const marker = "Learner question:";
  if (!text.includes("COURSE DETAIL MODE") || !text.includes(marker)) return text;
  const index = text.lastIndexOf(marker);
  return text.slice(index + marker.length).trimStart();
}


function userAttachmentLabels(content: unknown) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((part) => part && typeof part === "object" && "type" in part && (part as { type?: unknown }).type !== "text")
    .map((part) => {
      const item = part as { type?: unknown; metadata?: unknown; mimeType?: unknown };
      const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as { filename?: unknown; name?: unknown } : {};
      const name = typeof metadata.filename === "string" ? metadata.filename : typeof metadata.name === "string" ? metadata.name : "attachment";
      return `${String(item.type ?? "file")} · ${name}`;
    });
}

function contentToText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text ?? "");
        return "";
      })
      .join("\n");
  }
  return String(content ?? "");
}

function messageText(message: { content?: unknown }) {
  const content = message.content;
  return stripInjectedCourseContext(content);
}

function CopilotThreadHistoryRecorder({ threadId, title }: { threadId: string; title?: string }) {
  const { agent } = useAgent({ agentId: "primoria_tutor", threadId, updates: [UseAgentUpdate.OnMessagesChanged] });
  const recordedMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (agent.messages.length === 0) return;

    const userMessages = agent.messages.filter((message) => message.role === "user");
    const lastUser = userMessages[userMessages.length - 1];
    const lastUserText = messageText(lastUser ?? {}).trim();
    const summary = ensureThreadSummary(threadId, {
      title: title ?? (lastUserText ? lastUserText.slice(0, 48) : undefined),
      preview: lastUserText ? lastUserText.slice(0, 90) : undefined,
      messageCount: agent.messages.length,
      updatedAt: Date.now(),
    });
    void persistThreadSummaryToServer(summary);

    for (const message of agent.messages) {
      if (message.role !== "user" && message.role !== "assistant") continue;
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
  }, [agent.messages, threadId, title]);

  return null;
}

export function CopilotRestorePanel() {
  return (
    <div className="copilot-restore-panel" aria-live="polite">
      <span className="copilot-restore-dot" />
      <span>Restoring your conversation…</span>
    </div>
  );
}

export function PrimoriaCopilotChatSurface({
  threadId,
  title,
  placeholder = "Ask anything, or ask for an interactive visualization…",
  className,
  context,
  welcomeScreen = false,
  suggestions,
  composerContext,
}: {
  threadId: string;
  title?: string;
  placeholder?: string;
  className?: string;
  context?: { description: string; value: string };
  welcomeScreen?: boolean;
  suggestions?: { title: string; message: string }[];
  composerContext?: React.ReactNode;
}) {
  const { agent } = useAgent({ agentId: "primoria_tutor", threadId, updates: [UseAgentUpdate.OnMessagesChanged] });
  const stableContext = useMemo(
    () => ({
      description: context?.description ?? "Primoria surface",
      value: context?.value ?? "Main AI tutor chat.",
    }),
    [context?.description, context?.value],
  );
  useAgentContext(stableContext);
  useConfigureSuggestions(
    suggestions
      ? {
          available: "before-first-message",
          suggestions,
        }
      : null,
    [threadId, suggestions],
  );
  const [attachmentError, setAttachmentError] = useState("");
  const [restoration, setRestoration] = useState<{
    threadId: string;
    agent: typeof agent;
    done: boolean;
  }>(() => ({
    threadId,
    agent,
    done: false,
  }));
  const restoredThreadRef = useRef<string | null>(null);

  useEffect(() => {
    const resolvedThreadId = threadId;
    let cancelled = false;

    async function restore() {
      if (restoredThreadRef.current === resolvedThreadId) {
        setRestoration({ threadId: resolvedThreadId, agent, done: true });
        return;
      }

      setRestoration({ threadId: resolvedThreadId, agent, done: false });
      const stored = await hydrateThreadMessagesFromServer(resolvedThreadId);
      if (cancelled) return;

      const messages = stored
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          id: message.id,
          role: message.role as "user" | "assistant",
          content: stripInjectedCourseContext(message.content),
        }));

      agent.setMessages(messages as any);
      (agent as any).setState?.({});
      restoredThreadRef.current = resolvedThreadId;
      setRestoration({ threadId: resolvedThreadId, agent, done: true });
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [agent, threadId]);

  const restoredForCurrentAgent = restoration.done && restoration.threadId === threadId && restoration.agent === agent;

  if (!restoredForCurrentAgent) return <CopilotRestorePanel />;

  return (
    <div className={className}>
      <CopilotThreadHistoryRecorder key={`history-${threadId}`} threadId={threadId} title={title} />
      {attachmentError ? <p className="attachment-error copilot-attachment-error">{attachmentError}</p> : null}
      <CopilotChat
        key={`chat-${threadId}`}
        threadId={threadId}
        chatView={((props: CopilotChatViewProps) => (
          <PrimoriaChatView {...props} composerContext={composerContext} />
        )) as any}
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
        welcomeScreen={welcomeScreen ? PrimoriaMainWelcomeScreen : false}
        labels={{
          chatInputPlaceholder: placeholder,
          chatInputToolbarAddButtonLabel: "Attach files",
        }}
      />
    </div>
  );
}

export { MAIN_SUGGESTIONS as PRIMORIA_MAIN_SUGGESTIONS };
