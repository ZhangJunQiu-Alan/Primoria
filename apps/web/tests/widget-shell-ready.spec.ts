// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { WIDGET_SHELL_READY_TIMEOUT_MS, WidgetRenderer } from "../src/components/generative-ui/widget-renderer";

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

it("surfaces a retry when the shell never announces itself, then rebuilds it on a fresh channel", async () => {
  vi.useFakeTimers();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(WidgetRenderer, { title: "stuck", description: "stuck", html: "<p>Scene</p>", variant: "course" })));
    const frame = container.querySelector("iframe")!;
    const firstChannel = JSON.parse(frame.srcdoc.match(/const PRIMORIA_BRIDGE_CHANNEL = ("[^"]+")/)![1]);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(WIDGET_SHELL_READY_TIMEOUT_MS); });
    const alert = container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("did not start");
    await act(async () => (alert.querySelector("button") as HTMLButtonElement).click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    const secondChannel = JSON.parse(frame.srcdoc.match(/const PRIMORIA_BRIDGE_CHANNEL = ("[^"]+")/)![1]);
    expect(secondChannel).not.toBe(firstChannel);
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    await act(async () => window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, data: { type: "primoria-shell-ready", channel: secondChannel } })));
    expect(post.mock.calls.at(-1)?.[0].html).toBe("<p>Scene</p>");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});
