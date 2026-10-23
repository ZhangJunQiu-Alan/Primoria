import { z } from "zod";
import type { ImplementedComponent } from "./types";

export const PHOTON_EV_NM = 1239.8419843320026;
const fields = { wavelengthNM: z.number().min(200).max(800), workFunctionEV: z.number().min(1).max(5), photonRateTrillion: z.number().min(0).max(10), voltage: z.number().min(-6).max(6), view: z.enum(["current", "energy"]), showThreshold: z.boolean() };
export const PhotoelectricEffectConfigSchema = z.object({ wavelengthNM: fields.wavelengthNM.default(400), workFunctionEV: fields.workFunctionEV.default(2), photonRateTrillion: fields.photonRateTrillion.default(1), voltage: fields.voltage.default(-0.5), view: fields.view.default("energy"), showThreshold: fields.showThreshold.default(true) }).strict();
export const PhotoelectricEffectPatchSchema = z.object(fields).partial().strict();
export type PhotoelectricEffectConfig = z.infer<typeof PhotoelectricEffectConfigSchema>;
export const DEFAULT_PHOTOELECTRIC_EFFECT_CONFIG = PhotoelectricEffectConfigSchema.parse({});

export function computePhotoelectric(config: PhotoelectricEffectConfig) {
  const photonEnergyEV = PHOTON_EV_NM / config.wavelengthNM;
  const emitting = photonEnergyEV >= config.workFunctionEV;
  const maxKineticEV = Math.max(0, photonEnergyEV - config.workFunctionEV);
  const saturationCurrentNA = emitting ? 160.2176634 * config.photonRateTrillion : 0;
  const currentAtVoltage = (voltage: number) => {
    if (!emitting || config.photonRateTrillion === 0) return 0;
    const fraction = maxKineticEV < 1e-12 ? voltage >= 0 ? 1 : 0 : Math.max(0, Math.min(1, 1 + voltage / maxKineticEV));
    return saturationCurrentNA * fraction;
  };
  return { photonEnergyEV, emitting, maxKineticEV, stoppingVoltage: emitting ? maxKineticEV : null,
    thresholdWavelengthNM: PHOTON_EV_NM / config.workFunctionEV, saturationCurrentNA, currentAtVoltage, currentNA: currentAtVoltage(config.voltage) };
}

export const photoelectricEffectComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.photoelectric-effect", name: "光电效应与截止电压", catalogDescription: "光子能量、逸出功、阈频、光子流与遏止电压",
  configSchema: PhotoelectricEffectConfigSchema, patchSchema: PhotoelectricEffectPatchSchema,
  schemaDoc: "physics.photoelectric-effect config：wavelengthNM [200,800]nm 默认400；workFunctionEV [1,5]eV默认2；photonRateTrillion [0,10]×10¹²光子/s默认1；voltage 阳极相对阴极电压[-6,6]V默认-0.5；view=current|energy 默认energy；showThreshold 默认true。能量守恒精确；电流曲线假设单位量子效率、法向动能均匀分布，为教学近似。",
  patchHints: "增大光子流不增加最大动能；缩短波长才增加单光子能量；低于阈频再亮也不能逸出。正阳极电压收集电子，负电压阻碍收集。",
};
