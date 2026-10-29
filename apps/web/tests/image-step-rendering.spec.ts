// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { BlockRenderer } from "../src/components/course/block-renderer";
import type { ImageBlock } from "../src/lib/courses/types";

describe("image step rendering", () => {
  it.each(["ready", "error"] as const)("retains the %s image title and renders caption math safely", async (status) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    const root = createRoot(container);
    const block: ImageBlock = { id: "field", type: "image", title: "Electric field", assetId: "asset", imageKind: "structure_diagram", imageUrl: status === "ready" ? "/image.png" : "", status, alt: "Field diagram", caption: "The field is $E=F/q$. <script>alert(1)</script>" };
    try {
      await act(async () => root.render(createElement(BlockRenderer, { block, contentLanguage: "en" })));
      expect(container.querySelector(".course-block-meta")?.textContent).toContain("Electric field");
      expect(container.querySelectorAll(".course-image-caption .katex")).toHaveLength(1);
      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelectorAll(".course-image-block > img")).toHaveLength(status === "ready" ? 1 : 0);
      expect(container.querySelectorAll(".course-image-error")).toHaveLength(status === "error" ? 1 : 0);
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
