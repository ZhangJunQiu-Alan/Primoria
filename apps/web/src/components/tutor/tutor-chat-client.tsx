"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ToolCard } from "@/components/generative-ui/tool-card";
import type { ChatMessage, ToolStatusArtifact, TutorAgentResponse, TutorProviderSettings, TutorStreamEvent } from "@/lib/ai/types";
import { TutorComposer } from "./composer";
import { AssistantMessage, UserMessage } from "./message";

type UiMessage =
  | {
      id: string;
      role: "user";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      label: TutorAgentResponse["label"];
      content: string;
      artifacts: TutorAgentResponse["artifacts"];
      isError?: boolean;
      retryContent?: string;
    };

const initialMessages: UiMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    label: "Tutor team",
    content:
      "Hi. I’m your Primoria tutor. What would you like to learn today? I can explain concepts, walk through problems step by step, or create interactive visualizations.",
    artifacts: [],
  },
];

const CHAT_STORAGE_KEY = "primoria:tutor-chat-messages";

function isPersistableMessage(message: UiMessage) {
  if (message.role === "user") return true;
  return !message.isError && !message.artifacts.some((artifact) => artifact.type === "tool_status");
}

export function TutorChatClient({ settings, resetKey }: { settings: TutorProviderSettings; resetKey: number }) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (resetKey > 0) {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
      setMessages(initialMessages);
      setHydrated(true);
      return;
    }

    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as UiMessage[];
      if (Array.isArray(saved) && saved.length > 0) {
        setMessages(saved);
      }
    } catch {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
    }
    setHydrated(true);
  }, [resetKey]);

  useEffect(() => {
    if (!hydrated) return;
    const persistable = messages.filter(isPersistableMessage);
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(persistable));
  }, [hydrated, messages]);

  const apiMessages = useMemo<ChatMessage[]>(
    () =>
      messages
        .filter((message) => message.id !== "welcome")
        .filter((message) => message.role === "user" || !message.isError)
        .map((message) => ({
          role: message.role,
          content: message.content,
      })),
    [messages],
  );

  function updateAssistantMessage(messageId: string, update: Partial<Extract<UiMessage, { role: "assistant" }>>) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId || message.role !== "assistant") return message;
        return {
          ...message,
          ...update,
          artifacts: update.artifacts ?? message.artifacts,
        };
      }),
    );
  }

  function upsertToolStatus(
    artifacts: TutorAgentResponse["artifacts"],
    nextStatus: ToolStatusArtifact,
  ): TutorAgentResponse["artifacts"] {
    const existingIndex = artifacts.findIndex(
      (artifact) => artifact.type === "tool_status" && artifact.name === nextStatus.name,
    );
    if (existingIndex === -1) return [...artifacts, nextStatus];

    return artifacts.map((artifact, index) => (index === existingIndex ? nextStatus : artifact));
  }

  function upsertArtifact(
    artifacts: TutorAgentResponse["artifacts"],
    nextArtifact: TutorAgentResponse["artifacts"][number],
  ): TutorAgentResponse["artifacts"] {
    if (nextArtifact.type !== "html_widget") return [...artifacts, nextArtifact];

    const existingIndex = artifacts.findIndex(
      (artifact) => artifact.type === "html_widget" && artifact.title === nextArtifact.title,
    );
    if (existingIndex === -1) return [...artifacts, nextArtifact];

    return artifacts.map((artifact, index) => (index === existingIndex ? nextArtifact : artifact));
  }

  async function handleStreamingResponse(response: Response, retryContent: string) {
    if (!response.body) throw new Error("Tutor stream did not include a response body.");

    const assistantId = crypto.randomUUID();
    let assistantCreated = false;
    let pendingArtifacts: TutorAgentResponse["artifacts"] = [];
    let assistantArtifacts: TutorAgentResponse["artifacts"] = [];
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";

    async function handleEvent(event: TutorStreamEvent) {
      if (event.type === "assistant_message") {
        assistantCreated = true;
        assistantArtifacts = pendingArtifacts;
        setMessages((current) => [
          ...current,
          {
            id: assistantId,
            role: "assistant",
            label: event.label,
            content: event.reply,
            artifacts: assistantArtifacts,
          },
        ]);
        return;
      }

      if (event.type === "tool_status") {
        const targetArtifacts = assistantCreated ? assistantArtifacts : pendingArtifacts;
        const nextArtifacts = upsertToolStatus(targetArtifacts, event.artifact);
        if (assistantCreated) {
          assistantArtifacts = nextArtifacts;
          updateAssistantMessage(assistantId, { artifacts: assistantArtifacts });
        } else {
          pendingArtifacts = nextArtifacts;
        }
        return;
      }

      if (event.type === "artifact") {
        assistantArtifacts = upsertArtifact(assistantArtifacts, event.artifact);
        if (assistantCreated) {
          updateAssistantMessage(assistantId, { artifacts: assistantArtifacts });
        }
        return;
      }

      if (event.type === "artifact_delta") {
        assistantArtifacts = upsertArtifact(assistantArtifacts, event.artifact);

        if (assistantCreated) {
          updateAssistantMessage(assistantId, { artifacts: assistantArtifacts });
        }
        return;
      }

      if (event.type === "error") {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            label: "Tutor team",
            content: event.reply,
            artifacts: [],
            isError: true,
            retryContent,
          },
        ]);
      }
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        await handleEvent(JSON.parse(trimmed) as TutorStreamEvent);
      }
    }

    const remaining = buffer.trim();
    if (remaining) {
      await handleEvent(JSON.parse(remaining) as TutorStreamEvent);
    }
  }

  async function sendMessage(
    content: string,
    options: { appendUserMessage?: boolean; replaceMessageId?: string } = {},
  ) {
    const { appendUserMessage = true, replaceMessageId } = options;
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const nextApiMessages = appendUserMessage ? [...apiMessages, { role: "user" as const, content: trimmed }] : apiMessages;
    if (replaceMessageId) {
      setMessages((current) => current.filter((message) => message.id !== replaceMessageId));
    } else if (appendUserMessage) {
      setMessages((current) => [...current, userMessage]);
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextApiMessages, settings, stream: true }),
      });

      if (response.headers.get("content-type")?.includes("application/x-ndjson")) {
        await handleStreamingResponse(response, trimmed);
        if (!response.ok) throw new Error("Tutor request failed");
        return;
      }

      const result = (await response.json()) as TutorAgentResponse;
      if (!response.ok) throw new Error(result.reply || "Tutor request failed");

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          label: result.label,
          content: result.reply,
          artifacts: result.artifacts ?? [],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          label: "Tutor team",
          content: error instanceof Error ? error.message : "Something went wrong.",
          artifacts: [],
          isError: true,
          retryContent: trimmed,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="chat-canvas">
        <div className="thread">
          {messages.map((message) => {
            if (message.role === "user") {
              return <UserMessage key={message.id}>{message.content}</UserMessage>;
            }

            return (
              <Fragment key={message.id}>
                <AssistantMessage label={message.label} tone={message.isError ? "error" : "default"}>
                  <span>{message.content}</span>
                  {message.retryContent ? (
                    <button
                      className="retry-btn"
                      disabled={isLoading}
                      onClick={() =>
                        void sendMessage(message.retryContent ?? "", {
                          appendUserMessage: false,
                          replaceMessageId: message.id,
                        })
                      }
                    >
                      Retry
                    </button>
                  ) : null}
                </AssistantMessage>
                {message.artifacts.map((artifact, index) => (
                  <ToolCard key={`${message.id}-${index}`} artifact={artifact} onSendPrompt={sendMessage} />
                ))}
              </Fragment>
            );
          })}

          {isLoading ? (
            <AssistantMessage label="Tutor team">
              Thinking through the concept and deciding whether an interactive widget would help…
            </AssistantMessage>
          ) : null}
        </div>
      </section>

      <TutorComposer onSend={sendMessage} disabled={isLoading} />
    </>
  );
}
