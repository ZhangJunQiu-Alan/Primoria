// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { WidgetRenderer } from "../src/components/generative-ui/widget-renderer";

vi.mock("../src/lib/telemetry/visualization-client", () => ({ reportVisualizationEvent: vi.fn() }));

it("waits for the authenticated shell handshake before delivering content even after an initial iframe load", async () => {
  vi.useFakeTimers();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(WidgetRenderer, { title: "race", description: "race", html: "<button>Run</button>", variant: "course" })));
    const frame = container.querySelector("iframe")!;
    const target = frame.contentWindow!;
    const post = vi.spyOn(target, "postMessage");
    await act(async () => {
      frame.dispatchEvent(new Event("load"));
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(post).not.toHaveBeenCalled();
    const channel = JSON.parse(frame.srcdoc.match(/const PRIMORIA_BRIDGE_CHANNEL = ("[^"]+")/)![1]);
    await act(async () => window.dispatchEvent(new MessageEvent("message", { source: target, data: { type: "primoria-shell-ready", channel: "wrong" } })));
    expect(post).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new MessageEvent("message", { source: target, data: { type: "primoria-shell-ready", channel } })));
    expect(post.mock.calls.filter(([message]) => message.executeScripts === true)).toHaveLength(1);
    expect(post.mock.calls.at(-1)?.[0].html).toBe("<button>Run</button>");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});
