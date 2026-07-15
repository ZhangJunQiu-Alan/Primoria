import { describe, expect, it } from "vitest";
import {
  INTERACTIVE_COMPONENT_CATALOG,
  INTERACTIVE_COMPONENT_IDS,
  formatInteractiveCatalogLines,
} from "@primoria/contracts/artifacts/interactive-catalog";
import { COMPONENT_REGISTRY } from "../src/lib/interactive/components/registry";

// The contracts catalog is the agent's stage-1 routing prior; the web registry
// owns the schemas. They must list exactly the same components.

describe("interactive catalog ↔ registry sync", () => {
  it("lists exactly the registry's implemented componentIds", () => {
    const registryIds = COMPONENT_REGISTRY.filter((entry) => entry.implemented)
      .map((entry) => entry.componentId)
      .sort();
    expect([...INTERACTIVE_COMPONENT_IDS].sort()).toEqual(registryIds);
  });

  it("keeps names and descriptions in sync with the registry", () => {
    for (const entry of INTERACTIVE_COMPONENT_CATALOG) {
      const registryEntry = COMPONENT_REGISTRY.find((item) => item.componentId === entry.componentId);
      expect(registryEntry, entry.componentId).toBeDefined();
      expect(entry.name).toBe(registryEntry?.name);
      expect(entry.description).toBe(registryEntry?.catalogDescription);
    }
  });

  it("formats one prompt line per component", () => {
    const lines = formatInteractiveCatalogLines().split("\n");
    expect(lines).toHaveLength(INTERACTIVE_COMPONENT_CATALOG.length);
    expect(lines[0]).toContain("physics.lens-imaging");
  });
});
