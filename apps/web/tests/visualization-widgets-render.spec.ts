import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WIDGETS } from "../src/app/qa/declarative-lens/widgets";
import { COMPONENT_REGISTRY } from "../src/lib/qa/components/registry";

describe("visualization widget registry", () => {
  it("has one renderer for every implemented component and no orphan renderers", () => {
    const componentIds = COMPONENT_REGISTRY.filter((entry) => entry.implemented).map((entry) => entry.componentId).sort();
    expect(Object.keys(WIDGETS).sort()).toEqual(componentIds);
  });

  it.each(COMPONENT_REGISTRY.filter((entry) => entry.implemented).map((entry) => [entry.componentId, entry] as const))(
    "renders %s from its default config",
    (componentId, entry) => {
      const Renderer = WIDGETS[componentId];
      const config = entry.configSchema.parse({});
      const html = renderToStaticMarkup(createElement(Renderer, { config, onChange: () => undefined }));
      expect(html).toMatch(/^<(section|div)/);
      expect(html.length).toBeGreaterThan(300);
    },
  );
});
