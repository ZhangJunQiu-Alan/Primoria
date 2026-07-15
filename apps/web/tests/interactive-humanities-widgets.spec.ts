import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SourceComparisonWidget } from "../src/components/generative-ui/interactive/source-comparison";
import { TimelineCausalityWidget } from "../src/components/generative-ui/interactive/timeline-causality";
import { DEFAULT_SOURCE_COMPARISON_CONFIG } from "../src/lib/interactive/components/source-comparison";
import { DEFAULT_TIMELINE_CAUSALITY_CONFIG } from "../src/lib/interactive/components/timeline-causality";

describe("interactive humanities widgets", () => {
  it("provides student annotation and generated-content safeguards", () => {
    const pages = [
      renderToStaticMarkup(createElement(TimelineCausalityWidget, {
        config: DEFAULT_TIMELINE_CAUSALITY_CONFIG,
        onChange: () => undefined,
      })),
      renderToStaticMarkup(createElement(SourceComparisonWidget, {
        config: DEFAULT_SOURCE_COMPARISON_CONFIG,
        onChange: () => undefined,
      })),
    ];
    for (const html of pages) {
      expect(html).toContain("我的标注");
      expect(html).toContain("AI 生成的学习辅助内容");
      expect(html).toContain("textarea");
    }
  });
});
