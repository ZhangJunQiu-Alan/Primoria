// @vitest-environment jsdom
import { act, createElement, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScenePlayback } from "../src/components/generative-ui/interactive/primitives/scene-playback";

describe("scene playback lifecycle", () => {
  let root: Root;
  let container: HTMLDivElement;
  let latest: ReturnType<typeof useScenePlayback>;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let hidden: boolean;
  let reduced: boolean;
  let visibilityCallback: IntersectionObserverCallback;
  let disconnect: ReturnType<typeof vi.fn>;
  let oldHidden: PropertyDescriptor | undefined;

  function Harness() {
    const ref = useRef<HTMLDivElement>(null);
    latest = useScenePlayback(ref, 10);
    return createElement("div", { ref });
  }

  function frame(timestamp: number) {
    act(() => { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(timestamp); });
  }

  beforeEach(() => {
    frames = new Map(); nextFrame = 0; hidden = false; reduced = false;
    oldHidden = Object.getOwnPropertyDescriptor(document, "hidden");
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { visibilityCallback = callback; }
      observe() {}
      disconnect() { disconnect(); }
    });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    act(() => root.render(createElement(Harness)));
  });

  afterEach(() => {
    act(() => root.unmount()); container.remove();
    if (oldHidden) Object.defineProperty(document, "hidden", oldHidden); else delete (document as unknown as Record<string, unknown>).hidden;
    vi.unstubAllGlobals();
  });

  it("starts paused, advances with one bounded clock, and cancels on pause", () => {
    expect(frames.size).toBe(0);
    act(() => latest.start(0.25));
    frame(0); frame(1000);
    expect(latest.fraction).toBeCloseTo(0.255, 12);
    act(() => latest.stop());
    expect(frames.size).toBe(0);
    expect(latest.fraction).toBeCloseTo(0.255, 12);
  });

  it("suspends offscreen and resumes without accumulating background time", () => {
    act(() => latest.start(0)); frame(0); frame(50);
    act(() => visibilityCallback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(frames.size).toBe(0);
    act(() => visibilityCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    frame(100000);
    expect(latest.fraction).toBeCloseTo(0.005, 12);
  });

  it("suspends hidden documents and releases resources on unmount", () => {
    act(() => latest.start()); frame(0);
    hidden = true; act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(frames.size).toBe(0);
    hidden = false; act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(frames.size).toBe(1);
    act(() => root.unmount());
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalled();
    root = createRoot(container);
  });

  it("resets transient playback without writing a model configuration", () => {
    act(() => latest.start(0.7)); frame(0); frame(50);
    act(() => latest.reset());
    expect(latest.playing).toBe(false);
    expect(latest.fraction).toBeNull();
    expect(frames.size).toBe(0);
  });

  it("honors reduced-motion preferences", () => {
    reduced = true;
    act(() => root.render(createElement(Harness)));
    act(() => latest.start());
    expect(latest.reducedMotion).toBe(true);
    expect(latest.playing).toBe(false);
    expect(frames.size).toBe(0);
  });
});
