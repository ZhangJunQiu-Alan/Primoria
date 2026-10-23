import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CloseReadingConfigSchema, segmentAnnotatedPassage } from "../src/lib/interactive/components/close-reading";
import { CloseReadingWidget } from "../src/components/generative-ui/interactive/close-reading";

const config = CloseReadingConfigSchema.parse({
  passage: "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。",
  focus: "imagery",
  annotations: [
    { quote: "白日依山尽", focus: "imagery", device: "夕照", observation: "太阳沿山际落下。", effect: "展开远处的天际线。" },
    { quote: "黄河入海流", focus: "imagery", device: "流动", observation: "河水向远方延伸。", effect: "把眼前景象引向更广阔的空间。" },
    { quote: "更上一层楼", focus: "structure", device: "推进", observation: "从观看转向行动。", effect: "把视野的拓展与登高相连。" },
  ],
});

describe("direct close reading", () => {
  it("shows every annotation in the chosen focus without opening another panel", () => {
    const html = renderToStaticMarkup(createElement(CloseReadingWidget, { config, onChange: () => {} }));
    expect(html).toContain("展开远处的天际线。");
    expect(html).toContain("把眼前景象引向更广阔的空间。");
    expect(html).not.toContain("把视野的拓展与登高相连。");
    expect(html).not.toContain("<details");
    expect(html).toContain('data-component-id="literature.close-reading"');
  });
  it("keeps the original passage intact when highlighted evidence overlaps", () => {
    const result = segmentAnnotatedPassage(CloseReadingConfigSchema.parse({ ...config, annotations: [config.annotations[0], { ...config.annotations[0], quote: "依山" }] }));
    expect(result.segments.map((s) => s.text).join("")).toBe(config.passage);
    expect(result.missingAnnotationIndexes).toEqual([1]);
  });
  it("escapes text supplied as passage and annotation content", () => {
    const text = '<img src=x onerror="alert(1)">';
    const escaped = CloseReadingConfigSchema.parse({ passage: text, annotations: [{ ...config.annotations[0], quote: text, focus: "diction", observation: text }] });
    const html = renderToStaticMarkup(createElement(CloseReadingWidget, { config: escaped, onChange: () => {} }));
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
