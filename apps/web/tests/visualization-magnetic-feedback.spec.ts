// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveVisualization } from "../src/components/generative-ui/interactive-visualization";
import { loadInteractiveWidget } from "../src/components/generative-ui/interactive";
import { MagneticMotionConfigSchema, type MagneticMotionConfig } from "../src/lib/interactive/components/magnetic-motion";

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await loadInteractiveWidget("physics.magnetic-motion");
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function mount(config: Partial<MagneticMotionConfig> = {}) {
  await act(async () => root.render(createElement(InteractiveVisualization, {
    payload: { componentId: "physics.magnetic-motion", configVersion: 1, config: MagneticMotionConfigSchema.parse({ speedMillion: 2, ...config }) },
  })));
}

function slider(label: string, value: number) {
  const input = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  expect(input).not.toBeNull();
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function click(text: string) {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent === text);
  expect(button).toBeDefined();
  act(() => button!.click());
}

function trajectory() {
  const path = container.querySelector("[data-magnetic-trajectory]")!.getAttribute("d")!;
  expect(path).not.toMatch(/NaN|Infinity/);
  const points = [...path.matchAll(/[ML]([^,]+),([^ML]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), xs, ys };
}

describe("magnetic scene visual feedback", () => {
  it.each([
    { fieldMT: 1, pitchDeg: 90, view: "transverse" as const },
    { fieldMT: 1, pitchDeg: 55, view: "helix" as const },
    { fieldMT: 2, pitchDeg: 90, view: "transverse" as const },
  ])("visibly halves the trajectory when B doubles in showcase config %j", async (config) => {
    await mount(config);
    const before = trajectory();
    slider("B", config.fieldMT * 2);
    const after = trajectory();
    expect(after.width).toBeCloseTo(before.width / 2, 2);
    expect(after.height).toBeCloseTo(before.height / 2, 2);
    expect(container.textContent).toContain(`${config.fieldMT * 2} mT`);
  });

  it("visibly doubles the orbit when perpendicular speed doubles", async () => {
    await mount();
    const before = trajectory();
    slider("初始速率", 4);
    expect(trajectory().width).toBeCloseTo(before.width * 2, 2);
  });

  it("fits large proton trajectories only on request and retains that scale during further changes", async () => {
    await mount();
    click("质子");
    expect(container.textContent).toContain("轨迹超出视窗");
    click("适配轨迹");
    const fitted = trajectory();
    expect(Math.min(...fitted.xs)).toBeGreaterThanOrEqual(59.99);
    expect(Math.max(...fitted.xs)).toBeLessThanOrEqual(620.01);
    expect(Math.min(...fitted.ys)).toBeGreaterThanOrEqual(39.99);
    expect(Math.max(...fitted.ys)).toBeLessThanOrEqual(280.01);
    expect(container.textContent).not.toContain("轨迹超出视窗");
    slider("B", 2);
    expect(trajectory().width).toBeCloseTo(fitted.width / 2, 2);
    click("恢复默认比例");
    expect(container.textContent).toContain("轨迹超出视窗");
    expect(container.textContent).toContain("10 mm");
  });

  it("keeps purely parallel motion finite in both views", async () => {
    await mount({ pitchDeg: 0 });
    expect(trajectory().width).toBe(0);
    click("适配轨迹");
    expect(trajectory().width).toBe(0);
    click("空间轨迹");
    expect(trajectory().width).toBeGreaterThan(0);
    click("适配轨迹");
    expect(trajectory().width).toBeLessThanOrEqual(560.01);
  });

  it("moves the particle when elapsed periods change without rescaling its orbit", async () => {
    await mount();
    const before = trajectory();
    const marker = () => container.querySelector("[data-magnetic-particle]")!.getAttribute("cx");
    const start = marker();
    slider("周期进度", 0.25);
    expect(marker()).not.toBe(start);
    expect(trajectory().width).toBe(before.width);
    expect(trajectory().height).toBe(before.height);
  });
});
