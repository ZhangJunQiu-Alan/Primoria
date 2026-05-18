"use client";

import { Fragment, useMemo, useState } from "react";
import { ToolCard } from "@/components/generative-ui/tool-card";
import type { ChatMessage, TutorAgentResponse, TutorProviderSettings } from "@/lib/ai/types";
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

export function TutorChatClient({ settings }: { settings: TutorProviderSettings }) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

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

  async function sendMessage(content: string, options: { appendUserMessage?: boolean } = {}) {
    const { appendUserMessage = true } = options;
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const nextApiMessages = appendUserMessage ? [...apiMessages, { role: "user" as const, content: trimmed }] : apiMessages;
    if (appendUserMessage) {
      setMessages((current) => [...current, userMessage]);
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextApiMessages, settings }),
      });

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
                      onClick={() => void sendMessage(message.retryContent ?? "", { appendUserMessage: false })}
                    >
                      Retry
                    </button>
                  ) : null}
                </AssistantMessage>
                {message.artifacts.map((artifact, index) => (
                  <ToolCard key={`${message.id}-${index}`} artifact={artifact} />
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
