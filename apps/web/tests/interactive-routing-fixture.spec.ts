import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { COMPONENT_REGISTRY } from "../src/lib/interactive/components/registry";
import { buildSelectComponentPrompts } from "../src/lib/interactive/select-component";

describe("interactive routing evaluation fixture", () => {
  it("only expects registered components and covers all routing intents", () => {
    const fixture = JSON.parse(
      readFileSync(join(process.cwd(), "tests/fixtures/interactive-routing.v1.json"), "utf8"),
    ) as { cases: Array<{ intent: string; componentId: string | null }> };
    const ids = new Set(COMPONENT_REGISTRY.map((entry) => entry.componentId));
    expect(fixture.cases.length).toBeGreaterThanOrEqual(24);
    expect(new Set(fixture.cases.map((item) => item.intent))).toEqual(
      new Set(["create", "adjust", "off_catalog", "chat"]),
    );
    for (const item of fixture.cases) {
      if (item.componentId) expect(ids.has(item.componentId)).toBe(true);
    }
  });

  it("builds catalog-bounded prompts for current and new requests", () => {
    const fresh = buildSelectComponentPrompts("演示凸透镜成像", null);
    const adjust = buildSelectComponentPrompts("调大一点", { componentId: "physics.lens-imaging", config: {} });
    expect(fresh.system).toContain("physics.lens-imaging");
    expect(fresh.user).toContain("当前没有组件实例");
    expect(adjust.user).toContain("当前组件实例:physics.lens-imaging");
  });
});
