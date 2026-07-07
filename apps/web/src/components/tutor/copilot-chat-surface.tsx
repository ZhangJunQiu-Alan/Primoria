"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { useT } from "@/lib/i18n/client";
import {
  ensureThreadSummary,
  hydrateThreadMessagesFromServer,
  persistChatFeedbackToServer,
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
const PrimoriaComposerContext = createContext<React.ReactNode>(null);

// Course/lesson scope for the active chat, so assistant-message feedback can be
// attributed to the lesson the learner is in (module-level message components
// cannot receive surface props directly).
const PrimoriaChatScopeContext = createContext<{ courseId?: string | null; lessonId?: string | null }>({});

function AssistantFeedbackBar({ messageId }: { messageId: string }) {
  const { courseId, lessonId } = useContext(PrimoriaChatScopeContext);
  const t = useT();
  const [signal, setSignal] = useState<"positive" | "negative" | null>(null);

  // Switch-only: feedback is append-only with no undo signal, so we never clear
  // back to null (that would diverge from the DB). Re-clicking the active thumb
  // is a no-op; switching records the new signal (the processor keeps the latest
  // per message).
  function send(next: "positive" | "negative") {
    if (signal === next) return;
    setSignal(next);
    void persistChatFeedbackToServer({ targetMessageId: messageId, signal: next, via: "thumb", courseId, lessonId });
  }

  return (
    <div className="primoria-copilot-feedback" role="group" aria-label={t.tutor.feedbackGroup}>
      <button
        type="button"
        className={`primoria-copilot-feedback-btn${signal === "positive" ? " is-active" : ""}`}
        aria-pressed={signal === "positive"}
        aria-label={t.tutor.feedbackHelpful}
        onClick={() => send("positive")}
      >
        👍
      </button>
      <button
        type="button"
        className={`primoria-copilot-feedback-btn${signal === "negative" ? " is-active" : ""}`}
        aria-pressed={signal === "negative"}
        aria-label={t.tutor.feedbackNotHelpful}
        onClick={() => send("negative")}
      >
        👎
      </button>
    </div>
  );
}

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
    const t = useT();
    const safeContent = sanitizeCopilotAssistantText(stripInjectedCourseContext(message.content));
    const visibleContent = useProgressiveAssistantText(safeContent, Boolean(isRunning));
    const safeMessage = { ...message, content: safeContent };
    const hasText = visibleContent.trim().length > 0;
    const hasTools = Boolean(message.toolCalls?.length);
    const showThinking = Boolean(isRunning) && !hasText && !hasTools;

    if (!hasText && !hasTools && !showThinking) return null;

    return (
      <div
        data-testid="copilot-assistant-message"
        data-message-id={message.id}
        data-running={isRunning || undefined}
        className={["primoria-copilot-message", "primoria-copilot-assistant-message", className].filter(Boolean).join(" ")}
        {...props}
      >
        {hasText || showThinking ? (
          <div className="primoria-copilot-assistant-row">
            <div className="primoria-copilot-avatar" aria-hidden="true">
              <span />
            </div>
            <div className="primoria-copilot-bubble primoria-copilot-assistant-bubble">
              {hasText ? (
                <CourseMarkdown markdown={visibleContent} />
              ) : (
                <span className="primoria-copilot-thinking">{t.tutor.assistantThinking}</span>
              )}
              {isRunning ? <span className="primoria-stream-caret" aria-hidden="true" /> : null}
              {!isRunning && message.id ? <AssistantFeedbackBar messageId={message.id} /> : null}
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
          : message.role === "assistant"
            ? { ...message, content: sanitizeCopilotAssistantText(stripInjectedCourseContext(message.content)) }
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
  function PrimoriaChatView(props: CopilotChatViewProps) {
    const composerContext = useContext(PrimoriaComposerContext);
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
  const t = useT();
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
      {dragOver ? <div className="primoria-copilot-drop-overlay">{t.tutor.dropFiles}</div> : null}
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
  const t = useT();
  return (
    <div data-testid="copilot-welcome-screen" className="primoria-main-welcome">
      <div className="primoria-main-welcome-card">
        <h1>{t.tutor.heroTitle}</h1>
        <p>{t.tutor.heroSubtitle}</p>
        <div className="primoria-main-input">{input}</div>
        <div className="primoria-main-suggestions">{suggestionView}</div>
      </div>
    </div>
  );
}


function stripInjectedCourseContext(content: unknown) {
  const text = contentToText(content);
  const marker = "Learner question:";
  const hasHiddenContext = text.includes("COURSE DETAIL MODE") || text.includes("PRIMORIA LEARNER PROFILE");
  if (!hasHiddenContext || !text.includes(marker)) return text;
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

function messageText(message: { content?: unknown; role?: unknown }) {
  const text = stripInjectedCourseContext(message.content);
  return message.role === "assistant" ? sanitizeCopilotAssistantText(text) : text;
}

function CopilotThreadHistoryRecorder({ threadId, title, courseId, lessonId }: { threadId: string; title?: string; courseId?: string | null; lessonId?: string | null }) {
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
        courseId,
        lessonId,
      });
    }
  }, [agent.messages, threadId, title, courseId, lessonId]);

  return null;
}

export function CopilotRestorePanel() {
  const t = useT();
  return (
    <div className="copilot-restore-panel" aria-live="polite">
      <span className="copilot-restore-dot" />
      <span>{t.tutor.restoring}</span>
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
  courseId,
  lessonId,
}: {
  threadId: string;
  title?: string;
  placeholder?: string;
  className?: string;
  context?: { description: string; value: string };
  welcomeScreen?: boolean;
  suggestions?: { title: string; message: string }[];
  composerContext?: React.ReactNode;
  courseId?: string | null;
  lessonId?: string | null;
}) {
  const t = useT();
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
    done: boolean;
  }>(() => ({
    threadId,
    done: false,
  }));
  const restoredThreadRef = useRef<string | null>(null);

  useEffect(() => {
    const resolvedThreadId = threadId;
    let cancelled = false;

    async function restore() {
      if (restoredThreadRef.current === resolvedThreadId) {
        return;
      }

      setRestoration({ threadId: resolvedThreadId, done: false });
      setAttachmentError("");

      try {
        const stored = await hydrateThreadMessagesFromServer(resolvedThreadId);
        if (cancelled) return;

        const messages = stored
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            id: message.id,
            role: message.role as "user" | "assistant",
            content: message.role === "assistant"
              ? sanitizeCopilotAssistantText(stripInjectedCourseContext(message.content))
              : stripInjectedCourseContext(message.content),
          }));

        agent.setMessages(messages as any);
        (agent as any).setState?.({});
      } catch (error) {
        if (!cancelled) {
          setAttachmentError(error instanceof Error ? error.message : "Could not restore the previous conversation. Starting a fresh chat.");
        }
      } finally {
        if (!cancelled) {
          restoredThreadRef.current = resolvedThreadId;
          setRestoration({ threadId: resolvedThreadId, done: true });
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [agent, threadId]);

  const restoredForCurrentThread = restoration.done && restoration.threadId === threadId;

  if (!restoredForCurrentThread) return <CopilotRestorePanel />;

  return (
    <PrimoriaChatScopeContext.Provider value={{ courseId, lessonId }}>
    <div className={className}>
      <CopilotThreadHistoryRecorder key={`history-${threadId}`} threadId={threadId} title={title} courseId={courseId} lessonId={lessonId} />
      {attachmentError ? <p className="attachment-error copilot-attachment-error">{attachmentError}</p> : null}
      <PrimoriaComposerContext.Provider value={composerContext}>
        <CopilotChat
          key={`chat-${threadId}`}
          threadId={threadId}
          chatView={PrimoriaChatView}
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
            chatInputToolbarAddButtonLabel: t.tutor.attachFiles,
          }}
        />
      </PrimoriaComposerContext.Provider>
    </div>
    </PrimoriaChatScopeContext.Provider>
  );
}
