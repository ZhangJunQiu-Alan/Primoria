// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ messages: [] as Array<Record<string, unknown>>, persist: vi.fn(async () => {}) }));
vi.mock("@copilotkit/react-core/v2", () => {
  const stub = () => null;
  return {
    CopilotChat: stub, CopilotChatAssistantMessage: stub, CopilotChatMessageView: stub, CopilotChatUserMessage: stub, CopilotChatInput: stub,
    CopilotChatSuggestionView: stub, CopilotChatView: stub, CopilotChatAttachmentQueue: stub, CopilotChatReasoningMessage: stub, CopilotChatToolCallsView: stub,
    useAgentContext: stub, useConfigureSuggestions: stub, UseAgentUpdate: { OnMessagesChanged: "messages" },
    useAgent: () => ({ agent: { messages: mocks.messages } }),
  };
});
vi.mock("@/hooks/use-primoria-copilot", () => ({ sanitizeCopilotAssistantText: (text: string) => text }));
vi.mock("@/components/course/course-markdown", () => ({ CourseMarkdown: () => null }));
vi.mock("../src/components/tutor/home-summary", () => ({ HomeSummarySection: () => null }));
vi.mock("@/lib/copilot-thread-history", () => ({
  ensureThreadSummary: (_id: string, summary: unknown) => summary,
  hydrateThreadMessagesFromServer: vi.fn(async () => []),
  persistChatFeedbackToServer: vi.fn(),
  persistThreadMessageToServer: mocks.persist,
  persistThreadSummaryToServer: vi.fn(async () => {}),
}));

import { CopilotThreadHistoryRecorder } from "../src/components/tutor/copilot-chat-surface";

afterEach(() => { vi.useRealTimers(); mocks.persist.mockClear(); });

describe("chat history recorder", () => {
  it("debounces streaming writes but flushes the pending messages when the chat unmounts", async () => {
    vi.useFakeTimers();
    mocks.messages = [{ id: "u1", role: "user", content: "演示透镜" }, { id: "a1", role: "assistant", content: "好的" }];
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(createElement(CopilotThreadHistoryRecorder, { threadId: "thread-1" })));
    expect(mocks.persist).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    expect(mocks.persist.mock.calls.map((call) => (call as unknown[])[1])).toEqual([
      expect.objectContaining({ id: "u1", content: "演示透镜" }),
      expect.objectContaining({ id: "a1", content: "好的" }),
    ]);
    expect((mocks.persist.mock.calls[0] as unknown[])[2]).toEqual({ keepalive: true });
  });

  it("does not write twice when the debounced flush already ran", async () => {
    vi.useFakeTimers();
    mocks.messages = [{ id: "u2", role: "user", content: "hello" }];
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(createElement(CopilotThreadHistoryRecorder, { threadId: "thread-2" })));
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(mocks.persist).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    expect(mocks.persist).toHaveBeenCalledTimes(1);
  });
});
