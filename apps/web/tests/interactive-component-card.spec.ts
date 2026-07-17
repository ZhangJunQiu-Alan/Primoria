// @vitest-environment jsdom

import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveComponentCard } from "../src/components/generative-ui/interactive-component-card";
import { I18nProvider } from "../src/lib/i18n/client";

vi.mock("../src/components/generative-ui/interactive", () => ({
  WIDGETS: {
    "physics.lens-imaging": ({ config }: { config: Record<string, unknown> }) =>
      createElement("div", { "data-config": JSON.stringify(config) }),
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
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      requests.push(body);
      return {
        status: 200,
        json: async () => ({ ok: true, config: configs[requests.length - 1] }),
      } as Response;
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

    expect(requests[0]).toMatchObject({ instanceId: "tool-1", targetInstanceId: null, current: null });
    expect(requests[1]).toMatchObject({ instanceId: "tool-2", targetInstanceId: null, current: null });
    expect(requests[2]).toMatchObject({
      instanceId: "tool-3",
      targetInstanceId: "tool-1",
      current: configs[0],
    });
  });
});
