import { afterEach, describe, expect, it, vi } from "vitest";
import { persistThreadMessageToServer } from "../src/lib/copilot-thread-history";

afterEach(() => vi.unstubAllGlobals());

describe("thread message keepalive byte budget", () => {
  it.each([
    ["ASCII", "x".repeat(22_000), true],
    ["CJK", "中".repeat(22_000), false],
    ["emoji", "🙂".repeat(16_000), false],
  ])("uses UTF-8 byte size for %s content", async (_label, content, keepalive) => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", send);
    const message = { id: "m1", role: "assistant", content };
    await persistThreadMessageToServer("t1", message, { keepalive: true });
    expect(send).toHaveBeenCalledWith("/api/copilot-threads/t1/messages", expect.objectContaining({ body: JSON.stringify(message), keepalive }));
  });

  it.each([59_999, 60_000])("applies the boundary to the complete %i-byte JSON body", async (bytes) => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", send);
    const message = { id: "m1", role: "assistant", content: "" };
    message.content = "x".repeat(bytes - JSON.stringify(message).length);
    await persistThreadMessageToServer("t1", message, { keepalive: true });
    expect(send).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ keepalive: bytes < 60_000 }));
  });
});
