import { z } from "zod";
import { acidBaseTitrationComponent } from "./acid-base-titration";
import { angleMeasureComponent } from "./angle-measure";
import { argumentMapComponent } from "./argument-map";
import { characterRelationshipsComponent } from "./character-relationships";
import { climateComparisonComponent } from "./climate-comparison";
import { closeReadingComponent } from "./close-reading";
import { colorHarmonyComponent } from "./color-harmony";
import { experimentDesignComponent } from "./experiment-design";
import { functionExplorerComponent } from "./function-explorer";
import { lensImagingComponent } from "./lens-imaging";
import { narrativeArcComponent } from "./narrative-arc";
import { policyTradeoffComponent } from "./policy-tradeoff";
import { processSequenceComponent } from "./process-sequence";
import { rhythmPatternComponent } from "./rhythm-pattern";
import { sentenceStructureComponent } from "./sentence-structure";
import { sourceComparisonComponent } from "./source-comparison";
import { sortingStepsComponent } from "./sorting-steps";
import { timelineCausalityComponent } from "./timeline-causality";
import { waveSuperpositionComponent } from "./wave-superposition";
import type { ImplementedComponent, RegistryEntry } from "./types";

// Production component registry. Adding a component also requires the
// versioned JSON catalog, compact Agent catalog, and client widget map under
// components/generative-ui/interactive.

export const COMPONENT_REGISTRY: RegistryEntry[] = [
  lensImagingComponent,
  timelineCausalityComponent,
  sourceComparisonComponent,
  closeReadingComponent,
  argumentMapComponent,
  acidBaseTitrationComponent,
  waveSuperpositionComponent,
  sortingStepsComponent,
  functionExplorerComponent,
  angleMeasureComponent,
  processSequenceComponent,
  narrativeArcComponent,
  characterRelationshipsComponent,
  sentenceStructureComponent,
  policyTradeoffComponent,
  climateComparisonComponent,
  colorHarmonyComponent,
  rhythmPatternComponent,
  experimentDesignComponent,
];

export function getRegistryEntry(componentId: string | null | undefined): RegistryEntry | undefined {
  if (!componentId) return undefined;
  return COMPONENT_REGISTRY.find((entry) => entry.componentId === componentId);
}

export function getImplementedComponent(componentId: string | null | undefined): ImplementedComponent | undefined {
  const entry = getRegistryEntry(componentId);
  return entry?.implemented ? entry : undefined;
}

export const SelectDecisionSchema = z.object({
  intent: z.enum(["create", "adjust", "off_catalog", "chat"]),
  componentId: z.string().nullable(),
  reason: z.string().max(300),
});

export type SelectDecision = z.infer<typeof SelectDecisionSchema>;

export type LensRouteResponse = {
  ok: true;
  stage1: { decision: SelectDecision; ms: number };
  stage2:
    | { mode: "create"; config: Record<string, unknown>; ms: number }
    | { mode: "patch"; patch: Record<string, unknown>; ms: number }
    | null;
};
