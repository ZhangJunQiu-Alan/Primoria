import { parabolaIntersectionsComponent } from "./parabola-intersections";
import { wireResistanceComponent } from "./wire-resistance";
import { closedCircuitComponent } from "./closed-circuit";
import { poetryImageryComponent } from "./poetry-imagery";
import { cellDivisionComponent } from "./cell-division";
import { osmosisLabComponent } from "./osmosis-lab";
import { magneticMotionComponent } from "./magnetic-motion";
import { photoelectricEffectComponent } from "./photoelectric-effect";
import { linearSystemComponent } from "./linear-system";
import { quadraticEquationComponent } from "./quadratic-equation";
import { weakAcidBufferComponent } from "./weak-acid-buffer";
import { leverBalanceComponent } from "./lever-buoyancy";
import { buoyancyLabComponent } from "./lever-buoyancy";
import { electricFieldComponent } from "./electric-field";
import { binomialDistributionComponent } from "./binomial-distribution";
import { trigonometryCircleComponent } from "./trigonometry-circle";
import { chemicalEquilibriumComponent } from "./chemical-equilibrium";
import { molecularGeometryComponent } from "./molecular-geometry";
import { oscillationLabComponent } from "./oscillation-lab";
import { reactionKineticsComponent } from "./reaction-kinetics";
import { idealGasComponent } from "./ideal-gas";
import { earthSeasonsComponent } from "./earth-seasons";
import { chickenRabbitComponent } from "./chicken-rabbit";
import { fractionEquivalenceComponent } from "./fraction-equivalence";
import { mendelianGeneticsComponent } from "./mendelian-genetics";
import { moonPhasesComponent } from "./moon-phases";
import { circuitLabComponent } from "./circuit-lab";
import { projectileLabComponent } from "./projectile-lab";
import { refractionLabComponent } from "./refraction-lab";
import { calculusLabComponent } from "./calculus-lab";
import { z } from "zod";
import { INTERACTIVE_COMPONENT_CATALOG } from "@primoria/contracts/artifacts/interactive-catalog";
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

const componentModules: RegistryEntry[] = [
  parabolaIntersectionsComponent,
  wireResistanceComponent,
  closedCircuitComponent,
  poetryImageryComponent,
  cellDivisionComponent,
  osmosisLabComponent,
  magneticMotionComponent,
  photoelectricEffectComponent,
  linearSystemComponent,
  quadraticEquationComponent,
  weakAcidBufferComponent,
  leverBalanceComponent,
  buoyancyLabComponent,
  electricFieldComponent,
  binomialDistributionComponent,
  trigonometryCircleComponent,
  chemicalEquilibriumComponent,
  molecularGeometryComponent,
  oscillationLabComponent,
  reactionKineticsComponent,
  idealGasComponent,
  earthSeasonsComponent,
  chickenRabbitComponent,
  fractionEquivalenceComponent,
  mendelianGeneticsComponent,
  moonPhasesComponent,
  circuitLabComponent,
  projectileLabComponent,
  refractionLabComponent,
  calculusLabComponent,
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

export const COMPONENT_REGISTRY: RegistryEntry[] = componentModules.map((component) => {
  const metadata = INTERACTIVE_COMPONENT_CATALOG.find((entry) => entry.componentId === component.componentId);
  return metadata ? { ...component, name: metadata.name, catalogDescription: metadata.description } : component;
});

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
