import { describe, expect, it } from "vitest";
import { completedInteractiveToolIds, interactiveHistoryMetadata, restoreInteractiveHistory } from "../src/lib/interactive/chat-history";
const call = { id: "tool-1", type: "function", function: { name: "open_interactive_component", arguments: JSON.stringify({ component_id: "physics.lens-imaging", request: "lens" }) } };
const assistant = { id: "assistant", role: "assistant", content: "观察成像。", toolCalls: [call] };
const result = { id: "result", role: "tool", toolCallId: "tool-1", content: JSON.stringify({ type: "interactive_component_request", componentId: "physics.lens-imaging", request: "lens", instanceId: "tool-1" }) };
describe("interactive chat history", () => {
  it("round-trips the actual completed tool signal so reload restores the same instance", () => {
    const messages = [assistant, result];
    const complete = completedInteractiveToolIds(messages);
    const restored = restoreInteractiveHistory(messages.map((message) => ({ ...message, toolCalls: undefined, toolCallId: undefined, metadata: interactiveHistoryMetadata(message, complete) })));
    expect(restored[0]).toMatchObject({ toolCalls: [call], content: "观察成像。" });
    expect(restored[1]).toMatchObject({ role: "tool", toolCallId: "tool-1", content: result.content });
  });
  it("does not persist partial streamed tool calls or arbitrary tool outputs", () => {
    expect(interactiveHistoryMetadata(assistant, completedInteractiveToolIds([assistant]))).not.toHaveProperty("interactiveToolCalls");
    expect(interactiveHistoryMetadata({ ...result, toolCallId: "unrelated" }, new Set(["tool-1"]))).toBeNull();
    expect(restoreInteractiveHistory([{ ...result, metadata: { source: "old" } }])).toEqual([]);
  });
  it("retains historical text conversations", () => {
    expect(restoreInteractiveHistory([{ id: "u", role: "user", content: "hello" }, { id: "a", role: "assistant", content: "hi" }])).toEqual([{ id: "u", role: "user", content: "hello" }, { id: "a", role: "assistant", content: "hi" }]);
  });
});
