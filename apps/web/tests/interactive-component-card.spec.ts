import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InteractiveComponentCard } from "../src/components/generative-ui/interactive-component-card";
import { I18nProvider } from "../src/lib/i18n/client";

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
});
