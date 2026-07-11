import { describe, expect, it } from "vitest";
import {
  normalizeWidgetExternalUrl,
  WIDGET_EXTERNAL_URL_MAX_LENGTH,
  WIDGET_IFRAME_SANDBOX,
} from "../src/lib/ai/widget-bridge";

describe("widget bridge security contract", () => {
  it("keeps generated widgets in an opaque-origin script sandbox", () => {
    expect(WIDGET_IFRAME_SANDBOX).toBe("allow-scripts");
    expect(WIDGET_IFRAME_SANDBOX).not.toContain("allow-same-origin");
    expect(WIDGET_IFRAME_SANDBOX).not.toContain("allow-popups");
  });

  it("allows only credential-free HTTPS external links", () => {
    expect(normalizeWidgetExternalUrl(" https://developer.mozilla.org/en-US/docs/Web/HTML ")).toBe(
      "https://developer.mozilla.org/en-US/docs/Web/HTML",
    );
    expect(normalizeWidgetExternalUrl("http://example.com")).toBeNull();
    expect(normalizeWidgetExternalUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWidgetExternalUrl("data:text/html,hello")).toBeNull();
    expect(normalizeWidgetExternalUrl("/internal/path")).toBeNull();
    expect(normalizeWidgetExternalUrl("https://user:password@example.com")).toBeNull();
    expect(normalizeWidgetExternalUrl(`https://example.com/${"a".repeat(WIDGET_EXTERNAL_URL_MAX_LENGTH)}`)).toBeNull();
  });
});
