import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { leftConcentration: z.number().min(0).max(1), rightConcentration: z.number().min(0).max(1), initialLeftVolumeL: z.number().min(0.2).max(1.8), initialRightVolumeL: z.number().min(0.2).max(1.8), temperatureK: z.number().min(273).max(323), progress: z.number().min(0).max(1), mode: z.enum(["initial", "equilibrium"]) };
export const OsmosisLabConfigSchema = z.object({ leftConcentration: fields.leftConcentration.default(0.2), rightConcentration: fields.rightConcentration.default(0.6), initialLeftVolumeL: fields.initialLeftVolumeL.default(1), initialRightVolumeL: fields.initialRightVolumeL.default(1), temperatureK: fields.temperatureK.default(298), progress: fields.progress.default(0), mode: fields.mode.default("initial") }).strict();
export const OsmosisLabPatchSchema = z.object(fields).partial().strict();
export type OsmosisLabConfig = z.infer<typeof OsmosisLabConfigSchema>;
export const DEFAULT_OSMOSIS_LAB_CONFIG = OsmosisLabConfigSchema.parse({});

export function computeOsmosis(config: OsmosisLabConfig) {
  const molesL = config.leftConcentration * config.initialLeftVolumeL, molesR = config.rightConcentration * config.initialRightVolumeL;
  const totalVolume = config.initialLeftVolumeL + config.initialRightVolumeL, totalMoles = molesL + molesR;
  const equilibriumLeftVolume = totalMoles === 0 ? config.initialLeftVolumeL : totalVolume * molesL / totalMoles;
  const progress = config.mode === "equilibrium" ? 1 : config.progress;
  const leftVolume = config.initialLeftVolumeL + (equilibriumLeftVolume - config.initialLeftVolumeL) * progress;
  const rightVolume = totalVolume - leftVolume;
  const leftConcentration = leftVolume === 0 ? 0 : molesL / leftVolume, rightConcentration = rightVolume === 0 ? 0 : molesR / rightVolume;
  const limitState = progress === 1 && totalMoles > 0 && (molesL === 0 || molesR === 0);
  return { leftVolume, rightVolume, leftConcentration, rightConcentration, molesL, molesR, totalVolume, equilibriumLeftVolume, limitState,
    pressureDifferenceKPa: (rightConcentration - leftConcentration) * 8.314462618 * config.temperatureK,
    direction: limitState ? 0 : Math.sign(rightConcentration - leftConcentration) };
}

export const osmosisLabComponent: ImplementedComponent = {
  implemented: true, componentId: "biology.osmosis-lab", name: "渗透作用与浓度变化", catalogDescription: "选择透过膜、水迁移、溶质守恒与渗透压",
  configSchema: OsmosisLabConfigSchema, patchSchema: OsmosisLabPatchSchema,
  schemaDoc: "biology.osmosis-lab config：leftConcentration/rightConcentration各[0,1]mol/L 默认0.2/0.6；initialLeftVolumeL/initialRightVolumeL各[0.2,1.8]L 默认1/1；temperatureK [273,323]K 默认298；progress [0,1]默认0；mode=initial|equilibrium 默认initial。膜只通水、非电解质、等静水压可变容积模型；progress是状态插值而非真实时间。单侧纯水的最终状态是容积耗尽极限，不是两侧浓度相等的正常平衡。",
  patchHints: "水净迁移从低溶质浓度到高溶质浓度；溶质不穿膜，两侧物质的量分别守恒。不能把本模型当作有壁U形管或细胞膨压平衡。",
};
