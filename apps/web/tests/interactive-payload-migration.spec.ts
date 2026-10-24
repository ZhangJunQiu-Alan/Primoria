import { describe, expect, it } from "vitest";
import { INTERACTIVE_COMPONENT_CATALOG } from "@primoria/contracts/artifacts/interactive-catalog";
import { COMPONENT_REGISTRY } from "../src/lib/interactive/components/registry";
import {
  InteractivePayloadError,
  migrateInteractiveConfig,
  parseInteractivePayload,
  sanitizeInteractiveBlock,
  upgradeInteractiveBlock,
} from "../src/lib/interactive/payload";

const lens = { lensType: "convex", focalLength: 10, objectDistance: 30, objectHeight: 8, showRays: true };
const visual = (interactive: unknown) => ({ id: "b1", type: "visual" as const, title: "t", description: "d", engine: "interactive" as const, interactive });

describe("interactive payload version upgrades", () => {
  const fake = {
    componentId: "test.fake",
    migrations: {
      1: (config: Record<string, unknown>) => ({ ...config, step1: true }),
      2: ({ legacy, ...config }: Record<string, unknown>) => ({ ...config, renamed: legacy }),
    },
  };

  it("applies each n → n+1 step in order without mutating the stored config", () => {
    const stored = { legacy: 5 };
    expect(migrateInteractiveConfig(fake, 1, 3, stored)).toEqual({ step1: true, renamed: 5 });
    expect(stored).toEqual({ legacy: 5 });
    expect(migrateInteractiveConfig(fake, 3, 3, stored)).toBe(stored);
  });

  it("rejects a missing step or a version newer than the runtime", () => {
    expect(() => migrateInteractiveConfig({ componentId: "test.none" }, 1, 2, {})).toThrow(InteractivePayloadError);
    expect(() => migrateInteractiveConfig(fake, 4, 3, {})).toThrow(/newer than this runtime/);
    expect(() => parseInteractivePayload({ componentId: "physics.lens-imaging", configVersion: 99, config: lens })).toThrow(InteractivePayloadError);
    expect(() => parseInteractivePayload({ componentId: "missing.component", configVersion: 1, config: {} })).toThrow(InteractivePayloadError);
  });

  it("requires a complete migration chain for every bumped catalog version", () => {
    for (const entry of INTERACTIVE_COMPONENT_CATALOG) {
      const component = COMPONENT_REGISTRY.find((candidate) => candidate.componentId === entry.componentId);
      if (!component?.implemented) continue;
      for (let version = 1; version < entry.version; version += 1) {
        expect(component.migrations?.[version], `${entry.componentId} v${version} → v${version + 1}`).toBeTypeOf("function");
      }
    }
  });

  it("keeps an unreadable block on the read path but drops it from publications", () => {
    const unreadable = visual({ componentId: "physics.lens-imaging", configVersion: 99, config: lens });
    expect(upgradeInteractiveBlock(unreadable)).toBe(unreadable);
    const published = sanitizeInteractiveBlock(unreadable);
    expect(published).not.toHaveProperty("interactive");
    expect(published).toMatchObject({ engine: "interactive", title: "t", description: "d" });
    expect(sanitizeInteractiveBlock(visual({ componentId: "physics.lens-imaging", configVersion: 1, config: { ...lens, script: "x" } }))).not.toHaveProperty("interactive");
    expect(sanitizeInteractiveBlock(visual({ componentId: "physics.lens-imaging", configVersion: 1, config: lens })).interactive).toEqual({ componentId: "physics.lens-imaging", configVersion: 1, config: lens });
  });
});
