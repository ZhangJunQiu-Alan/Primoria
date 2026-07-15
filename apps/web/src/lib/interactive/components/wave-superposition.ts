import { z } from "zod";
import type { ImplementedComponent } from "./types";

export const WaveSuperpositionConfigSchema = z.object({
  amplitude1: z.number().min(0.2).max(2).default(1),
  amplitude2: z.number().min(0.2).max(2).default(1),
  frequency1: z.number().min(0.5).max(3).default(1),
  frequency2: z.number().min(0.5).max(3).default(1),
  phaseDiffDeg: z.number().min(0).max(360).default(0),
  showComponents: z.boolean().default(true),
});
export type WaveSuperpositionConfig = z.infer<typeof WaveSuperpositionConfigSchema>;
export const WaveSuperpositionPatchSchema = z.object({
  amplitude1: z.number().min(0.2).max(2), amplitude2: z.number().min(0.2).max(2),
  frequency1: z.number().min(0.5).max(3), frequency2: z.number().min(0.5).max(3),
  phaseDiffDeg: z.number().min(0).max(360), showComponents: z.boolean(),
}).partial();
export const DEFAULT_WAVE_SUPERPOSITION_CONFIG = WaveSuperpositionConfigSchema.parse({});

export function sampleWave(config: WaveSuperpositionConfig, x: number, time = 0) {
  const phase = config.phaseDiffDeg * Math.PI / 180;
  const wave1 = config.amplitude1 * Math.sin(2 * Math.PI * config.frequency1 * (x - time));
  const wave2 = config.amplitude2 * Math.sin(2 * Math.PI * config.frequency2 * (x - time) + phase);
  return { wave1, wave2, resultant: wave1 + wave2 };
}

export function describeSuperposition(config: WaveSuperpositionConfig) {
  const sameFrequency = Math.abs(config.frequency1 - config.frequency2) < 1e-9;
  const equalAmplitude = Math.abs(config.amplitude1 - config.amplitude2) < 1e-9;
  const normalizedPhase = ((config.phaseDiffDeg % 360) + 360) % 360;
  return {
    beatFrequency: Math.abs(config.frequency1 - config.frequency2),
    relation: sameFrequency && equalAmplitude && Math.abs(normalizedPhase - 180) < 1e-9 ? "destructive" as const : sameFrequency && Math.min(normalizedPhase, 360 - normalizedPhase) < 1e-9 ? "constructive" as const : "mixed" as const,
  };
}

export const waveSuperpositionComponent: ImplementedComponent = {
  implemented: true,
  componentId: "physics.wave-superposition",
  name: "波的叠加",
  catalogDescription: "两列简谐波及其合成波,振幅、频率和相位可调",
  configSchema: WaveSuperpositionConfigSchema,
  patchSchema: WaveSuperpositionPatchSchema,
  schemaDoc: `physics.wave-superposition 的 config 字段(全部字段都有默认值,只写有把握的字段):
- amplitude1/amplitude2: 两列波的振幅,无量纲,[0.2,2],默认 1
- frequency1/frequency2: 两列波的频率,Hz,[0.5,3],默认 1
- phaseDiffDeg: 第二列波相对第一列的相位差,度,[0,360],默认 0
- showComponents: 是否显示两列分波,默认 true`,
  patchHints: `「完全抵消/相消」表示等振幅、等频率且 phaseDiffDeg=180;「完全叠加/相长」表示 phaseDiffDeg=0;「第二列波快一点」frequency2 约 +30%。`,
};
