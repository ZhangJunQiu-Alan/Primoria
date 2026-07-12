import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WIDGET_DEPENDENCY_ALLOWLIST as WEB_ALLOWLIST } from "../src/lib/ai/widget-dependencies";
import {
  WIDGET_DEPENDENCIES_BY_URL,
  WIDGET_DEPENDENCY_ALLOWLIST,
} from "@primoria/contracts/artifacts/widget-dependencies";

const agentVisualizationSource = readFileSync(
  fileURLToPath(new URL("../../agent/src/tools/visualization.mjs", import.meta.url)),
  "utf8",
);

const widgetRendererSource = readFileSync(
  fileURLToPath(new URL("../src/components/generative-ui/widget-renderer.tsx", import.meta.url)),
  "utf8",
);

// The allowlist used to be maintained as three hand-synced copies (agent tool,
// web normalizer, iframe bootstrap). It is now single-sourced from
// @primoria/contracts/artifacts/widget-dependencies; these tests guard against
// a copy being reintroduced.
describe("widget dependency allowlist single source", () => {
  it("web re-exports the contracts allowlist object itself", () => {
    expect(WEB_ALLOWLIST).toBe(WIDGET_DEPENDENCY_ALLOWLIST);
  });

  it("every entry is a jsdelivr script with a global and an exact URL", () => {
    const entries = Object.entries(WIDGET_DEPENDENCY_ALLOWLIST);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, dep] of entries) {
      expect(dep.kind, key).toBe("script");
      expect(dep.global, key).toBeTruthy();
      expect(new URL(dep.url).origin, key).toBe("https://cdn.jsdelivr.net");
      expect(WIDGET_DEPENDENCIES_BY_URL.get(dep.url), key).toBe(dep);
    }
  });

  it("the agent widget tool imports the contracts allowlist instead of defining one", () => {
    expect(agentVisualizationSource).toContain("@primoria/contracts/artifacts/widget-dependencies");
    expect(agentVisualizationSource).not.toContain("cdn.jsdelivr.net");
  });

  it("the iframe bootstrap injects the contracts allowlist instead of embedding a copy", () => {
    expect(widgetRendererSource).toContain(
      "var COMMON_DEPENDENCIES = ${JSON.stringify(WIDGET_DEPENDENCY_ALLOWLIST)};",
    );
    // The CSP header and the jsdelivr hostname check remain; what must not
    // come back is a hardcoded package-URL allowlist entry.
    expect(widgetRendererSource).not.toContain("cdn.jsdelivr.net/npm/");
  });
});
