// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveVisualization } from "../src/components/generative-ui/interactive-visualization";
import { loadInteractiveWidget } from "../src/components/generative-ui/interactive";
import { DEFAULT_WAVE_SUPERPOSITION_CONFIG } from "../src/lib/interactive/components/wave-superposition";
import { DEFAULT_PHOTOELECTRIC_EFFECT_CONFIG } from "../src/lib/interactive/components/photoelectric-effect";
import { DEFAULT_SENTENCE_STRUCTURE_CONFIG } from "../src/lib/interactive/components/sentence-structure";
import { DEFAULT_NARRATIVE_ARC_CONFIG } from "../src/lib/interactive/components/narrative-arc";
import { DEFAULT_POLICY_TRADEOFF_CONFIG } from "../src/lib/interactive/components/policy-tradeoff";

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await Promise.all(["physics.wave-superposition", "physics.photoelectric-effect", "language.sentence-structure", "literature.narrative-arc", "social.policy-tradeoff"].map(loadInteractiveWidget));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function mount(componentId: string, config: object) {
  await act(async () => root.render(createElement(InteractiveVisualization, {
    payload: { componentId, configVersion: 1, config },
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

function height(path: string) {
  expect(path).not.toMatch(/NaN|Infinity/);
  const ys = [...path.matchAll(/[ML]([^,]+),([^ML]+)/g)].map((match) => Number(match[2]));
  return Math.max(...ys) - Math.min(...ys);
}

describe("wave feedback", () => {
  it("doubles the visible resultant height when both amplitudes double", async () => {
    await mount("physics.wave-superposition", DEFAULT_WAVE_SUPERPOSITION_CONFIG);
    const path = () => container.querySelector("svg > path:last-child")!.getAttribute("d")!;
    const initialHeight = height(path());
    slider("振幅 A₁", 2);
    slider("振幅 A₂", 2);
    expect(height(path())).toBeCloseTo(initialHeight * 2, 0);
    expect(container.textContent).toContain("纵轴固定为 −4～4");
  });

  it("resumes from the paused phase and advances on the next animation frame", async () => {
    let serial = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    const frame = (time: number) => act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(time)); });
    await mount("physics.wave-superposition", DEFAULT_WAVE_SUPERPOSITION_CONFIG);
    const path = () => container.querySelector("svg > path:last-child")!.getAttribute("d");
    const initial = path();
    click("播放");
    frame(0);
    frame(450);
    click("暂停");
    const paused = path();
    expect(paused).not.toBe(initial);
    expect(frames.size).toBe(0);
    click("播放");
    frame(5000);
    expect(path()).toBe(paused);
    frame(5100);
    expect(path()).not.toBe(paused);
  });
});

describe("photoelectric feedback", () => {
  it("increases curve height tenfold while preserving axes and stopping potential", async () => {
    await mount("physics.photoelectric-effect", { ...DEFAULT_PHOTOELECTRIC_EFFECT_CONFIG, view: "current" });
    const svg = () => container.querySelector('svg[aria-label="光电流与外加电压"]')!;
    const initialHeight = height(svg().querySelector("path")!.getAttribute("d")!);
    const ticks = [...svg().querySelectorAll("text")].map((text) => text.textContent);
    const stop = svg().querySelector('line[stroke-dasharray="3 5"]')!.getAttribute("x1");
    slider("光子流", 10);
    expect(height(svg().querySelector("path")!.getAttribute("d")!)).toBeCloseTo(initialHeight * 10, 1);
    expect([...svg().querySelectorAll("text")].map((text) => text.textContent)).toEqual(ticks);
    expect(svg().querySelector('line[stroke-dasharray="3 5"]')!.getAttribute("x1")).toBe(stop);
    slider("光子流", 0);
    expect(height(svg().querySelector("path")!.getAttribute("d")!)).toBe(0);
  });

  it("keeps sub-threshold light at zero current even at maximum photon flux", async () => {
    await mount("physics.photoelectric-effect", { ...DEFAULT_PHOTOELECTRIC_EFFECT_CONFIG, view: "current", wavelengthNM: 800, photonRateTrillion: 10 });
    expect(height(container.querySelector('svg[aria-label="光电流与外加电压"] path')!.getAttribute("d")!)).toBe(0);
    expect(container.textContent).toContain("不能逸出");
  });
});

describe("sentence analysis views", () => {
  it("shows distinct dependency, phrase, ordered-fragment and root-group views", async () => {
    await mount("language.sentence-structure", DEFAULT_SENTENCE_STRUCTURE_CONFIG);
    const view = () => container.querySelector("[data-sentence-view]")!;
    expect(view().textContent).toContain("依存于 → notices");
    click("短语");
    expect(view().textContent).not.toContain("依存于");
    expect(view().textContent).toContain("subject");
    click("语序");
    expect([...view().querySelectorAll("li b")].map((node) => node.textContent)).toEqual(["The careful reader", "notices", "the contrast"]);
    click("分句");
    expect(view().textContent).toContain("句法根: notices");
    expect(view().textContent).toContain("不是对原句分句边界的自动判定");
  });

  it("orders supplied fragments by the original sentence, independent of annotation order", async () => {
    await mount("language.sentence-structure", { ...DEFAULT_SENTENCE_STRUCTURE_CONFIG, phrases: [...DEFAULT_SENTENCE_STRUCTURE_CONFIG.phrases].reverse(), targetStructure: "word-order" });
    expect([...container.querySelectorAll("li b")].map((node) => node.textContent)).toEqual(["The careful reader", "notices", "the contrast"]);
  });

  it("retains cyclic fragments as unresolved instead of inventing a clause root", async () => {
    await mount("language.sentence-structure", { ...DEFAULT_SENTENCE_STRUCTURE_CONFIG, targetStructure: "clause", phrases: [{ id: "a", text: "one", role: "subject", dependsOnId: "b" }, { id: "b", text: "two", role: "predicate", dependsOnId: "a" }] });
    expect(container.textContent).toContain("未能归入依存根的片段");
    expect(container.textContent).toContain("one · two");
  });
});

describe("narrative model feedback", () => {
  it("changes model guides and episodic geometry without rewriting authored events", async () => {
    await mount("literature.narrative-arc", DEFAULT_NARRATIVE_ARC_CONFIG);
    const svg = () => container.querySelector('svg[aria-label="叙事张力曲线"]')!;
    expect(svg().querySelectorAll("rect")).toHaveLength(5);
    expect(svg().textContent).toContain("铺陈");
    click("三幕式");
    expect(svg().querySelectorAll("rect")).toHaveLength(3);
    expect(svg().textContent).toContain("第二幕 · 对抗");
    click("章节式");
    expect(svg().querySelector("path")).toBeNull();
    expect(svg().querySelectorAll('line[stroke-width="16"]')).toHaveLength(DEFAULT_NARRATIVE_ARC_CONFIG.beats.length);
    expect(container.textContent).toContain(DEFAULT_NARRATIVE_ARC_CONFIG.beats[0].event);
    expect(container.textContent).toContain("张力 2/10");
    click("五段式");
    expect(svg().querySelector("path")).not.toBeNull();
  });
});

describe("policy weight feedback", () => {
  it("updates all relative weights without declaring a winning option", async () => {
    await mount("social.policy-tradeoff", DEFAULT_POLICY_TRADEOFF_CONFIG);
    const values = () => [...container.querySelectorAll('[role="meter"]')].map((meter) => Number(meter.getAttribute("aria-valuenow")));
    expect(values()).toEqual([41.7, 25, 33.3]);
    slider("Access", 1);
    expect(values()).toEqual([12.5, 37.5, 50]);
    expect(container.textContent).toContain("权重帮助提问，不自动判定赢家");
    expect(container.querySelectorAll("article")).toHaveLength(2);
  });
});
