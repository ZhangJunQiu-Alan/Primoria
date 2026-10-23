import { describe, expect, it } from "vitest";
import { assembleOfflineWidget } from "../scripts/visualization-replay/offline-widget";

describe("captured custom visualization replay", () => {
  it("preserves the actual fragment and places an offline policy ahead of every script", () => {
    const fragment = '<button id="run">Change</button><script>document.getElementById("run").textContent="Ready"</script>';
    const replay = assembleOfflineWidget({ title: "Captured", description: "Actual model output", html: fragment })!;
    expect(replay.title).toBe("Captured");
    expect(replay.html).toContain(fragment);
    expect(replay.html.indexOf("Content-Security-Policy")).toBeLessThan(replay.html.indexOf("<script"));
    expect(replay.html).toContain("connect-src 'none'");
    expect(replay.html).toContain("form-action 'none'");
    expect(replay.html).toContain("frame-src 'none'");
  });
  it("does not claim offline support for a widget requiring an external dependency", () => {
    expect(assembleOfflineWidget({ description: "x", html: "<div>Chart</div>", dependencies: [{ url: "https://cdn.jsdelivr.net/npm/chart.js" }] })).toBeNull();
    expect(assembleOfflineWidget({ title: "missing actual HTML" })).toBeNull();
  });
});
