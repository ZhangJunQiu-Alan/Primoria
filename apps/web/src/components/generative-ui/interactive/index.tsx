"use client";

import type { ReactElement } from "react";
import { AcidBaseTitrationConfigSchema } from "@/lib/interactive/components/acid-base-titration";
import { AngleMeasureConfigSchema } from "@/lib/interactive/components/angle-measure";
import { ArgumentMapConfigSchema } from "@/lib/interactive/components/argument-map";
import { CharacterRelationshipsConfigSchema } from "@/lib/interactive/components/character-relationships";
import { ClimateComparisonConfigSchema } from "@/lib/interactive/components/climate-comparison";
import { CloseReadingConfigSchema } from "@/lib/interactive/components/close-reading";
import { ColorHarmonyConfigSchema } from "@/lib/interactive/components/color-harmony";
import { ExperimentDesignConfigSchema } from "@/lib/interactive/components/experiment-design";
import { FunctionExplorerConfigSchema } from "@/lib/interactive/components/function-explorer";
import { LensImagingConfigSchema } from "@/lib/interactive/components/lens-imaging";
import { NarrativeArcConfigSchema } from "@/lib/interactive/components/narrative-arc";
import { PolicyTradeoffConfigSchema } from "@/lib/interactive/components/policy-tradeoff";
import { ProcessSequenceConfigSchema } from "@/lib/interactive/components/process-sequence";
import { RhythmPatternConfigSchema } from "@/lib/interactive/components/rhythm-pattern";
import { SentenceStructureConfigSchema } from "@/lib/interactive/components/sentence-structure";
import { SourceComparisonConfigSchema } from "@/lib/interactive/components/source-comparison";
import { SortingStepsConfigSchema } from "@/lib/interactive/components/sorting-steps";
import { TimelineCausalityConfigSchema } from "@/lib/interactive/components/timeline-causality";
import { WaveSuperpositionConfigSchema } from "@/lib/interactive/components/wave-superposition";
import type { ComponentConfig } from "@/lib/interactive/components/types";
import { AcidBaseTitrationWidget } from "./acid-base-titration";
import { AngleMeasureWidget } from "./angle-measure";
import { ArgumentMapWidget } from "./argument-map";
import { CharacterRelationshipsWidget } from "./character-relationships";
import { ClimateComparisonWidget } from "./climate-comparison";
import { CloseReadingWidget } from "./close-reading";
import { ColorHarmonyWidget } from "./color-harmony";
import { ExperimentDesignWidget } from "./experiment-design";
import { FunctionExplorerWidget } from "./function-explorer";
import { LensImagingWidget } from "./lens-imaging";
import { NarrativeArcWidget } from "./narrative-arc";
import { PolicyTradeoffWidget } from "./policy-tradeoff";
import { ProcessSequenceWidget } from "./process-sequence";
import { RhythmPatternWidget } from "./rhythm-pattern";
import { SentenceStructureWidget } from "./sentence-structure";
import { SourceComparisonWidget } from "./source-comparison";
import { SortingStepsWidget } from "./sorting-steps";
import { TimelineCausalityWidget } from "./timeline-causality";
import { WaveSuperpositionWidget } from "./wave-superposition";

// componentId → widget renderer. Each entry parses the (server-validated)
// config back into its own type at the boundary. New components register here
// and nowhere else on the client.

export type WidgetRenderProps = {
  config: ComponentConfig;
  onChange: (next: ComponentConfig) => void;
};

export const WIDGETS: Record<string, (props: WidgetRenderProps) => ReactElement> = {
  "physics.lens-imaging": ({ config, onChange }) => (
    <LensImagingWidget config={LensImagingConfigSchema.parse(config)} onChange={onChange} />
  ),
  "general.timeline-causality": ({ config, onChange }) => (
    <TimelineCausalityWidget config={TimelineCausalityConfigSchema.parse(config)} onChange={onChange} />
  ),
  "humanities.source-comparison": ({ config, onChange }) => (
    <SourceComparisonWidget config={SourceComparisonConfigSchema.parse(config)} onChange={onChange} />
  ),
  "literature.close-reading": ({ config, onChange }) => (
    <CloseReadingWidget config={CloseReadingConfigSchema.parse(config)} onChange={onChange} />
  ),
  "humanities.argument-map": ({ config, onChange }) => (
    <ArgumentMapWidget config={ArgumentMapConfigSchema.parse(config)} onChange={onChange} />
  ),
  "chem.acid-base-titration": ({ config, onChange }) => (
    <AcidBaseTitrationWidget config={AcidBaseTitrationConfigSchema.parse(config)} onChange={onChange} />
  ),
  "physics.wave-superposition": ({ config, onChange }) => (
    <WaveSuperpositionWidget config={WaveSuperpositionConfigSchema.parse(config)} onChange={onChange} />
  ),
  "cs.sorting-steps": ({ config, onChange }) => (
    <SortingStepsWidget config={SortingStepsConfigSchema.parse(config)} onChange={onChange} />
  ),
  "math.function-explorer": ({ config, onChange }) => (
    <FunctionExplorerWidget config={FunctionExplorerConfigSchema.parse(config)} onChange={onChange} />
  ),
  "math.angle-measure": ({ config, onChange }) => (
    <AngleMeasureWidget config={AngleMeasureConfigSchema.parse(config)} onChange={onChange} />
  ),
  "general.process-sequence": ({ config, onChange }) => (
    <ProcessSequenceWidget config={ProcessSequenceConfigSchema.parse(config)} onChange={onChange} />
  ),
  "literature.narrative-arc": ({ config, onChange }) => (
    <NarrativeArcWidget config={NarrativeArcConfigSchema.parse(config)} onChange={onChange} />
  ),
  "literature.character-relationships": ({ config, onChange }) => (
    <CharacterRelationshipsWidget config={CharacterRelationshipsConfigSchema.parse(config)} onChange={onChange} />
  ),
  "language.sentence-structure": ({ config, onChange }) => (
    <SentenceStructureWidget config={SentenceStructureConfigSchema.parse(config)} onChange={onChange} />
  ),
  "social.policy-tradeoff": ({ config, onChange }) => (
    <PolicyTradeoffWidget config={PolicyTradeoffConfigSchema.parse(config)} onChange={onChange} />
  ),
  "geography.climate-comparison": ({ config, onChange }) => (
    <ClimateComparisonWidget config={ClimateComparisonConfigSchema.parse(config)} onChange={onChange} />
  ),
  "arts.color-harmony": ({ config, onChange }) => (
    <ColorHarmonyWidget config={ColorHarmonyConfigSchema.parse(config)} onChange={onChange} />
  ),
  "music.rhythm-pattern": ({ config, onChange }) => (
    <RhythmPatternWidget config={RhythmPatternConfigSchema.parse(config)} onChange={onChange} />
  ),
  "psychology.experiment-design": ({ config, onChange }) => (
    <ExperimentDesignWidget config={ExperimentDesignConfigSchema.parse(config)} onChange={onChange} />
  ),
};
