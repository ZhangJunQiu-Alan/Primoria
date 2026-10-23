import { z } from "zod";
import type { ImplementedComponent } from "./types";

export const GAS_CONSTANT = 8.314462618;
const fields = { temperatureK: z.number().min(100).max(1000), volumeL: z.number().min(0.5).max(50), amountMol: z.number().min(0.1).max(3), gas: z.enum(["helium", "nitrogen", "oxygen"]), mode: z.enum(["isothermal", "isochoric"]) };
export const IdealGasConfigSchema = z.object({ temperatureK: fields.temperatureK.default(300), volumeL: fields.volumeL.default(10), amountMol: fields.amountMol.default(1), gas: fields.gas.default("nitrogen"), mode: fields.mode.default("isothermal") }).strict();
export const IdealGasPatchSchema = z.object(fields).partial().strict();
export type IdealGasConfig = z.infer<typeof IdealGasConfigSchema>;
export const DEFAULT_IDEAL_GAS_CONFIG = IdealGasConfigSchema.parse({});

export function computeIdealGas(config: IdealGasConfig) {
  const molarMass = { helium: 0.004002602, nitrogen: 0.0280134, oxygen: 0.0319988 }[config.gas];
  return { pressureKPa: config.amountMol * GAS_CONSTANT * config.temperatureK / config.volumeL,
    rmsSpeed: Math.sqrt(3 * GAS_CONSTANT * config.temperatureK / molarMass),
    meanTranslationalEnergyPerMol: 1.5 * GAS_CONSTANT * config.temperatureK,
    pressureAtVolume: (volumeL: number) => config.amountMol * GAS_CONSTANT * config.temperatureK / volumeL,
    pressureAtTemperature: (temperatureK: number) => config.amountMol * GAS_CONSTANT * temperatureK / config.volumeL };
}

export const idealGasComponent: ImplementedComponent = {
  implemented: true, componentId: "chem.ideal-gas", name: "理想气体状态与分子运动", catalogDescription: "PV=nRT、等温等容曲线和方均根速率",
  configSchema: IdealGasConfigSchema, patchSchema: IdealGasPatchSchema,
  schemaDoc: `chem.ideal-gas config：temperatureK [100,1000]K 默认300；volumeL [0.5,50]L 默认10；amountMol [0.1,3]mol 默认1；gas=helium|nitrogen|oxygen 默认nitrogen；mode=isothermal|isochoric 默认isothermal。PV=nRT，P用kPa；不模拟真实气体相变，温度必须是绝对温标。`,
  patchHints: "等温比较保持temperatureK；等容比较保持volumeL；摄氏度先加273.15转K。同温下不同气体的方均根速率不同，但同n/V的压强相同。",
};
