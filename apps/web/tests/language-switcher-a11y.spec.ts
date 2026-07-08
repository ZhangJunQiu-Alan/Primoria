import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("../src/components/i18n/language-switcher.tsx", import.meta.url)),
  "utf8",
);

describe("LanguageSwitcher accessibility contract", () => {
  it("keeps keyboard navigation and focus management for the custom menu", () => {
    expect(source).toContain("handleControlKeyDown");
    expect(source).toContain("handleMenuKeyDown");
    expect(source).toContain('event.key === "ArrowDown"');
    expect(source).toContain('event.key === "ArrowUp"');
    expect(source).toContain('event.key === "Home"');
    expect(source).toContain('event.key === "End"');
    expect(source).toContain('event.key === "Enter" || event.key === " "');
    expect(source).toContain("optionRefs.current[activeIndex]?.focus()");
    expect(source).toContain("tabIndex={activeIndex === index ? 0 : -1}");
    expect(source).toContain("controlRef.current?.focus()");
  });
});
