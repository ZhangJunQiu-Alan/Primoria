// @vitest-environment jsdom

import { act, createElement, StrictMode, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveComponentCard } from "../src/components/generative-ui/interactive-component-card";
import { I18nProvider } from "../src/lib/i18n/client";

vi.mock("../src/components/generative-ui/interactive", () => ({
  WIDGETS: {
    "physics.lens-imaging": ({ config, onChange }: { config: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) =>
      createElement("div", { "data-config": JSON.stringify(config) }, createElement("button", { onClick: () => onChange({ ...config, focalLength: Number(config.focalLength) + 1 }) }, "change parameter")),
  },
}));

vi.mock("../src/lib/telemetry/visualization-client", () => ({ reportVisualizationEvent: vi.fn() }));

const roots = new Set<Root>();

async function mount(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  await act(async () => root.render(element));
  return container;
}

async function waitFor(assertion: () => void, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
    }
    await act(async () => new Promise((resolve) => setTimeout(resolve, 5)));
  }
  throw lastError;
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(async () => {
  for (const root of roots) {
    await act(async () => root.unmount());
  }
  roots.clear();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("InteractiveComponentCard", () => {
  it("shows a graceful notice for a component id outside the widget map", () => {
    const html = renderToStaticMarkup(
      createElement(InteractiveComponentCard, { componentId: "fake.component", request: "x" }),
    );
    expect(html).toContain("暂不支持该互动组件");
  });

  it("renders the loading state before a config exists", () => {
    const html = renderToStaticMarkup(
      createElement(InteractiveComponentCard, { componentId: "physics.lens-imaging", request: "演示凸透镜成像" }),
    );
    expect(html).toContain("正在为你准备互动组件");
  });

  it("reads card copy from the active dictionary", () => {
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        { initialLanguage: "en" },
        createElement(InteractiveComponentCard, { componentId: "fake.component", request: "x" }),
      ),
    );
    expect(html).toContain("This interactive component is not supported yet");
    expect(html).not.toContain("暂不支持该互动组件");
  });

  it("isolates same-component cards and adjusts only an explicit target instance", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const configs = [{ focalLength: 10 }, { focalLength: 20 }, { focalLength: 15 }];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404 });
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      requests.push(body);
      return new Response(JSON.stringify({ ok: true, componentId: "physics.lens-imaging", configVersion: 1, revision: 1, config: configs[requests.length - 1] }));
    }));

    await mount(createElement(InteractiveComponentCard, {
      componentId: "physics.lens-imaging",
      request: "first lens",
      instanceId: "tool-1",
    }));
    await waitFor(() => expect(requests).toHaveLength(1));

    await mount(createElement(InteractiveComponentCard, {
      componentId: "physics.lens-imaging",
      request: "second lens",
      instanceId: "tool-2",
    }));
    await waitFor(() => expect(requests).toHaveLength(2));

    await mount(createElement(InteractiveComponentCard, {
      componentId: "physics.lens-imaging",
      request: "adjust the first lens",
      instanceId: "tool-3",
      targetInstanceId: "tool-1",
    }));
    await waitFor(() => expect(requests).toHaveLength(3));

    expect(requests[0]).toMatchObject({ instanceId: "tool-1", targetInstanceId: null });
    expect(requests[1]).toMatchObject({ instanceId: "tool-2", targetInstanceId: null });
    expect(requests[2]).toMatchObject({
      instanceId: "tool-3",
      targetInstanceId: "tool-1",
    });
    expect(requests.every((request) => !("current" in request))).toBe(true);
  });

  it("restores saved output without regeneration, including StrictMode effect replay", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, componentId: "physics.lens-imaging", configVersion: 1, revision: 3, config: { focalLength: 13 } })));
    vi.stubGlobal("fetch", fetchMock);
    const container = await mount(createElement(StrictMode, null, createElement(InteractiveComponentCard, { componentId: "physics.lens-imaging", request: "saved", instanceId: "saved-tool" })));
    await waitFor(() => expect(container.querySelector("[data-config]")?.getAttribute("data-config")).toContain('"focalLength":13'));
    expect(fetchMock.mock.calls.every((call) => (call as unknown[])[1] === undefined || !((call as unknown[])[1] as RequestInit)?.method)).toBe(true);
  });

  it("does not regenerate when reading an existing output fails", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "db unavailable" }), { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const container = await mount(createElement(InteractiveComponentCard, { componentId: "physics.lens-imaging", request: "existing", instanceId: "unavailable-tool" }));
    await waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Retry");
  });

  it("keeps local controls immediate and retries a failed save without another model call", async () => {
    const writes: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        writes.push(JSON.parse(String(init.body)));
        if (writes.length === 1) return new Response(JSON.stringify({ ok: false }), { status: 503 });
        return new Response(JSON.stringify({ ok: true, componentId: "physics.lens-imaging", configVersion: 1, revision: 2, config: { focalLength: 11 } }));
      }
      if (init?.method === "POST") throw new Error("Unexpected model regeneration");
      return new Response(JSON.stringify({ ok: true, componentId: "physics.lens-imaging", configVersion: 1, revision: 1, config: { focalLength: 10 } }));
    }));
    const container = await mount(createElement(InteractiveComponentCard, { componentId: "physics.lens-imaging", request: "saved", instanceId: "save-retry" }));
    await waitFor(() => expect(container.querySelector("button")?.textContent).toBe("change parameter"));
    await act(async () => (container.querySelector("button") as HTMLButtonElement).click());
    expect(container.querySelector("[data-config]")?.getAttribute("data-config")).toContain('"focalLength":11');
    await waitFor(() => expect(container.textContent).toContain("Retry save"));
    const retry = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Retry save"))!;
    await act(async () => retry.click());
    await waitFor(() => expect(container.querySelector('[role="alert"]')).toBeNull());
    expect(writes).toHaveLength(2);
    expect(writes[1]).toEqual(writes[0]);
    expect(writes[1]).toMatchObject({ instanceId: "save-retry", revision: 1, config: { focalLength: 11 } });
  });
});
