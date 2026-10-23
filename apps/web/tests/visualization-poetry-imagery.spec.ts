// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gradePoetryClassification, POETRY_SCENES, PoetryImageryConfigSchema, PoetryImageryPatchSchema } from "../src/lib/interactive/components/poetry-imagery";
import { PoetryImageryWidget } from "../src/components/generative-ui/interactive/poetry-imagery";

describe("poetry text and evidence integrity", () => {
  it("validates only the bundled texts and declared teaching modes", () => {
    expect(PoetryImageryConfigSchema.parse({}).poemId).toBe("autumn-thoughts");
    expect(PoetryImageryConfigSchema.safeParse({ poemId: "unwritten-poem" }).success).toBe(false);
    expect(PoetryImageryPatchSchema.safeParse({ html: "x" }).success).toBe(false);
    expect(PoetryImageryPatchSchema.safeParse({ poem: "任意生成原文" }).success).toBe(false);
  });
  it("anchors every quotation to a non-overlapping exact span of the original line", () => {
    expect(Object.values(POETRY_SCENES).map((poem) => poem.phrases.length)).toEqual([12, 6, 7]);
    for (const poem of Object.values(POETRY_SCENES)) {
      expect(new Set(poem.phrases.map((phrase) => phrase.id)).size).toBe(poem.phrases.length);
      expect(poem.translation).toHaveLength(poem.lines.length);
      for (const [index, line] of poem.lines.entries()) {
        const spans = poem.phrases.filter((phrase) => phrase.line === index).map((phrase) => ({ start: line.indexOf(phrase.quote), length: phrase.quote.length })).sort((a, b) => a.start - b.start);
        spans.forEach((span, n) => { expect(span.start).toBeGreaterThanOrEqual(0); if (n) expect(span.start).toBeGreaterThanOrEqual(spans[n - 1].start + spans[n - 1].length); });
      }
      for (const phrase of poem.phrases) { expect(poem.groups.some((group) => group.id === phrase.group)).toBe(true); expect(phrase.observation.every(Boolean) && phrase.effect.every(Boolean)).toBe(true); }
    }
  });
  it("grades the authored reading groups without inventing answers for unknown IDs", () => {
    expect(gradePoetryClassification("autumn-thoughts", "house", "home")).toBe(true);
    expect(gradePoetryClassification("autumn-thoughts", "house", "bleak")).toBe(false);
    expect(gradePoetryClassification("quiet-night", "frost", "light")).toBe(true);
    expect(gradePoetryClassification("quiet-night", "missing", "light")).toBeNull();
    expect(gradePoetryClassification("quiet-night", "moon", "missing")).toBeNull();
  });
  it("keeps uncertainty and interpretation explicit", () => {
    const frost = POETRY_SCENES["quiet-night"].phrases.find((phrase) => phrase.id === "frost")!;
    expect(frost.observation[0]).toContain("猜想"); expect(frost.effect[0]).toContain("不把联想当作天气事实");
    expect(POETRY_SCENES["autumn-thoughts"].interpretation[0]).toContain("一种有文本证据的解读");
  });
  it("renders all texts and modes without non-finite values or arbitrary resources", () => {
    for (const poemId of Object.keys(POETRY_SCENES) as Array<keyof typeof POETRY_SCENES>) for (const view of ["scene", "evidence", "classify", "complete"] as const) {
      const html = renderToStaticMarkup(createElement(PoetryImageryWidget, { config: PoetryImageryConfigSchema.parse({ poemId, view }), onChange: () => {} }));
      expect(html).toContain('data-component-id="chinese.poetry-imagery"'); expect(html).not.toMatch(/NaN|Infinity|undefined|<iframe|<script|<audio/);
      expect(html).toContain(POETRY_SCENES[poemId].title[0]);
    }
  });
});

describe("poetry local practice and selection", () => {
  let root: Root, container: HTMLDivElement;
  const onChange = vi.fn();
  const render = (config: Parameters<typeof PoetryImageryConfigSchema.parse>[0]) => act(() => root.render(createElement(PoetryImageryWidget, { config: PoetryImageryConfigSchema.parse(config), onChange })));
  const button = (text: string) => [...container.querySelectorAll("button")].find((entry) => entry.textContent === text)!;
  const click = (text: string) => act(() => button(text).click());
  beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); onChange.mockClear(); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  it("shows all observations in evidence mode without an expand gate", () => {
    render({ view: "evidence" });
    for (const phrase of POETRY_SCENES["autumn-thoughts"].phrases) expect(container.textContent).toContain(phrase.observation[0]);
    expect([...container.querySelectorAll("button")].some((entry) => /展开|打开实验/.test(entry.textContent ?? ""))).toBe(false);
  });
  it("links a keyboard-selected image to the same textual evidence without model writes", () => {
    render({});
    const home = container.querySelector('svg [aria-label="人家"]')!;
    act(() => home.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(home.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toContain("原句明确写到有人居住的地方");
    expect(onChange).not.toHaveBeenCalled();
  });
  it("allows correction, counts each phrase once and resets only local practice", () => {
    render({ view: "classify" }); click("安居的反衬"); expect(container.querySelector('[role="status"]')?.textContent).toContain("再看词语");
    click("暮色与旅途"); click("暮色与旅途"); expect(container.querySelector("dl")?.textContent).toContain("1 / 12");
    click("重置练习"); expect(container.querySelector("dl")?.textContent).toContain("0 / 12"); expect(onChange).not.toHaveBeenCalled();
  });
  it("checks the original missing phrase and clears feedback for the next item", () => {
    render({ view: "complete" }); click("枯藤"); expect(container.querySelector('[role="status"]')?.textContent).toContain("正确： 枯藤老树昏鸦");
    click("下一题"); expect(container.querySelector('[role="status"]')?.textContent).toContain("选词后核对原句"); expect(onChange).not.toHaveBeenCalled();
  });
  it("does not carry selected evidence or answers into a different poem", () => {
    render({ view: "classify" }); click("暮色与旅途"); render({ poemId: "quiet-night", view: "classify" });
    expect(container.querySelector("dl")?.textContent).toContain("0 / 7"); expect(container.querySelector('[role="status"]')?.textContent).toContain("先选一项");
  });
});
