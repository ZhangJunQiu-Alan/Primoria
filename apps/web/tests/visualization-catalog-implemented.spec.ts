import { describe, expect, it } from "vitest";
import catalog from "../../../data/visualization-components/catalog.v1.json";
import { DEFAULT_ACID_BASE_TITRATION_CONFIG } from "../src/lib/interactive/components/acid-base-titration";
import { DEFAULT_ANGLE_MEASURE_CONFIG } from "../src/lib/interactive/components/angle-measure";
import { DEFAULT_ARGUMENT_MAP_CONFIG } from "../src/lib/interactive/components/argument-map";
import { DEFAULT_CHARACTER_RELATIONSHIPS_CONFIG } from "../src/lib/interactive/components/character-relationships";
import { DEFAULT_CLIMATE_COMPARISON_CONFIG } from "../src/lib/interactive/components/climate-comparison";
import { DEFAULT_CLOSE_READING_CONFIG } from "../src/lib/interactive/components/close-reading";
import { DEFAULT_COLOR_HARMONY_CONFIG } from "../src/lib/interactive/components/color-harmony";
import { DEFAULT_EXPERIMENT_DESIGN_CONFIG } from "../src/lib/interactive/components/experiment-design";
import { DEFAULT_FUNCTION_EXPLORER_CONFIG } from "../src/lib/interactive/components/function-explorer";
import { DEFAULT_LENS_CONFIG } from "../src/lib/interactive/components/lens-imaging";
import { DEFAULT_NARRATIVE_ARC_CONFIG } from "../src/lib/interactive/components/narrative-arc";
import { DEFAULT_POLICY_TRADEOFF_CONFIG } from "../src/lib/interactive/components/policy-tradeoff";
import { DEFAULT_PROCESS_SEQUENCE_CONFIG } from "../src/lib/interactive/components/process-sequence";
import { DEFAULT_RHYTHM_PATTERN_CONFIG } from "../src/lib/interactive/components/rhythm-pattern";
import { DEFAULT_SENTENCE_STRUCTURE_CONFIG } from "../src/lib/interactive/components/sentence-structure";
import { DEFAULT_SOURCE_COMPARISON_CONFIG } from "../src/lib/interactive/components/source-comparison";
import { DEFAULT_SORTING_STEPS_CONFIG } from "../src/lib/interactive/components/sorting-steps";
import { DEFAULT_TIMELINE_CAUSALITY_CONFIG } from "../src/lib/interactive/components/timeline-causality";
import { DEFAULT_WAVE_SUPERPOSITION_CONFIG } from "../src/lib/interactive/components/wave-superposition";

const runtimeDefaults = new Map<string, unknown>([
  ["physics.lens-imaging", DEFAULT_LENS_CONFIG],
  ["general.timeline-causality", DEFAULT_TIMELINE_CAUSALITY_CONFIG],
  ["humanities.source-comparison", DEFAULT_SOURCE_COMPARISON_CONFIG],
  ["literature.close-reading", DEFAULT_CLOSE_READING_CONFIG],
  ["humanities.argument-map", DEFAULT_ARGUMENT_MAP_CONFIG],
  ["chem.acid-base-titration", DEFAULT_ACID_BASE_TITRATION_CONFIG],
  ["physics.wave-superposition", DEFAULT_WAVE_SUPERPOSITION_CONFIG],
  ["cs.sorting-steps", DEFAULT_SORTING_STEPS_CONFIG],
  ["math.function-explorer", DEFAULT_FUNCTION_EXPLORER_CONFIG],
  ["math.angle-measure", DEFAULT_ANGLE_MEASURE_CONFIG],
  ["general.process-sequence", DEFAULT_PROCESS_SEQUENCE_CONFIG],
  ["literature.narrative-arc", DEFAULT_NARRATIVE_ARC_CONFIG],
  ["literature.character-relationships", DEFAULT_CHARACTER_RELATIONSHIPS_CONFIG],
  ["language.sentence-structure", DEFAULT_SENTENCE_STRUCTURE_CONFIG],
  ["social.policy-tradeoff", DEFAULT_POLICY_TRADEOFF_CONFIG],
  ["geography.climate-comparison", DEFAULT_CLIMATE_COMPARISON_CONFIG],
  ["arts.color-harmony", DEFAULT_COLOR_HARMONY_CONFIG],
  ["music.rhythm-pattern", DEFAULT_RHYTHM_PATTERN_CONFIG],
  ["psychology.experiment-design", DEFAULT_EXPERIMENT_DESIGN_CONFIG],
]);

describe("implemented visualization catalog entries", () => {
  it("match the runtime component default configs", () => {
    for (const [componentId, runtimeDefault] of runtimeDefaults) {
      const entry = catalog.components.find((component) => component.componentId === componentId);
      expect(entry, `missing catalog entry ${componentId}`).toBeDefined();
      expect(entry?.implementation.status).toBe("implemented");
      expect(entry?.configSchema.default).toEqual(runtimeDefault);
    }
  });

  it("does not mark a catalog entry implemented without a runtime component", () => {
    const implementedIds = catalog.components
      .filter((component) => component.implementation.status === "implemented")
      .map((component) => component.componentId)
      .sort();
    expect(implementedIds).toEqual([...runtimeDefaults.keys()].sort());
  });
});
