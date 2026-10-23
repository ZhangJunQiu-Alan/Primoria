// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SvgDragHandle, useDragViewport } from "../src/components/generative-ui/interactive/primitives/svg-drag-handle";

const initial = { xMin: -3, xMax: 5, yMin: -6, yMax: 10 };
let root: Root;
let container: HTMLDivElement;
let latest: ReturnType<typeof useDragViewport>;

function Harness({ visible = false, bounds = initial }: { visible?: boolean; bounds?: typeof initial }) {
  latest = useDragViewport(bounds);
  return createElement("div", null, createElement("output", null, latest.dragging ? "dragging" : "idle"), visible ? createElement("svg", null, createElement(SvgDragHandle, { x: 10, y: 10, tone: "green", label: "vertex", onMove: () => {}, onDragStart: latest.lock, onDragEnd: latest.release })) : null);
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  act(() => root.render(createElement(Harness)));
});

afterEach(() => {
  act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
});

describe("temporary plot viewport", () => {
  it("keeps the camera fixed during model changes and fits only on request", () => {
    act(() => latest.lock());
    const changed = { xMin: -2, xMax: 8, yMin: -10, yMax: 20 };
    act(() => root.render(createElement(Harness, { bounds: changed })));
    expect(latest.viewport).toEqual(initial);
    expect(latest.dragging).toBe(true);
    act(() => latest.release());
    expect(latest.dragging).toBe(false);
    expect(latest.viewport).toEqual(initial);
    act(() => latest.fit());
    expect(latest.viewport).toEqual(changed);
  });
  it("zooms around the same center and returns with the inverse factor", () => {
    act(() => latest.zoom(0.8));
    expect(latest.viewport.xMax - latest.viewport.xMin).toBeCloseTo(6.4, 12);
    expect((latest.viewport.xMin + latest.viewport.xMax) / 2).toBe(1);
    act(() => latest.zoom(1.25));
    expect(latest.viewport.xMin).toBeCloseTo(initial.xMin, 12);
    expect(latest.viewport.yMax).toBeCloseTo(initial.yMax, 12);
  });
  it("declines invalid or unusable zoom levels", () => {
    for (const factor of [0, -1, Infinity, NaN, 1e10, 1e-10]) act(() => latest.zoom(factor));
    expect(latest.viewport).toEqual(initial);
  });
});

function pointer(target: Element, type: string, pointerId: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, { pointerId: { value: pointerId }, isPrimary: { value: true } });
  act(() => { target.dispatchEvent(event); });
}

describe("drag cancellation and unmount", () => {
  it("ignores another pointer cancellation and releases the active pointer", () => {
    act(() => root.render(createElement(Harness, { visible: true })));
    const handle = container.querySelector("[data-drag-handle]")!;
    Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
    pointer(handle, "pointerdown", 1);
    expect(container.querySelector("output")?.textContent).toBe("dragging");
    pointer(handle, "pointercancel", 2);
    expect(container.querySelector("output")?.textContent).toBe("dragging");
    pointer(handle, "pointercancel", 1);
    expect(container.querySelector("output")?.textContent).toBe("idle");
  });
  it("unlocks the camera when an active handle disappears", () => {
    act(() => root.render(createElement(Harness, { visible: true })));
    const handle = container.querySelector("[data-drag-handle]")!;
    Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
    pointer(handle, "pointerdown", 1);
    expect(container.querySelector("output")?.textContent).toBe("dragging");
    act(() => root.render(createElement(Harness, { visible: false })));
    expect(container.querySelector("output")?.textContent).toBe("idle");
  });
});
