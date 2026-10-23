import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = {
  resistivityMicroOhmM: z.number().min(0.01).max(2), lengthM: z.number().min(0.1).max(20), areaMM2: z.number().min(0.05).max(10),
  temperatureC: z.number().min(-20).max(150), temperatureCoefficient: z.number().min(0).max(0.006), view: z.enum(["geometry", "length", "area", "temperature"]),
};
export const WireResistanceConfigSchema = z.object({ resistivityMicroOhmM: fields.resistivityMicroOhmM.default(0.017), lengthM: fields.lengthM.default(5), areaMM2: fields.areaMM2.default(1), temperatureC: fields.temperatureC.default(20), temperatureCoefficient: fields.temperatureCoefficient.default(0.0039), view: fields.view.default("geometry") }).strict();
export const WireResistancePatchSchema = z.object(fields).partial().strict();
export type WireResistanceConfig = z.infer<typeof WireResistanceConfigSchema>;
export const DEFAULT_WIRE_RESISTANCE_CONFIG = WireResistanceConfigSchema.parse({});

export function computeWireResistance(config: WireResistanceConfig) {
  const temperatureFactor = 1 + config.temperatureCoefficient * (config.temperatureC - 20);
  const resistivity = config.resistivityMicroOhmM * temperatureFactor;
  const resistance20 = config.resistivityMicroOhmM * config.lengthM / config.areaMM2;
  return { resistivity, temperatureFactor, resistance20, resistance: resistivity * config.lengthM / config.areaMM2, diameterMM: 2 * Math.sqrt(config.areaMM2 / Math.PI), temperatureChangePercent: (temperatureFactor - 1) * 100 };
}

export const wireResistanceComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.wire-resistance", name: "导线电阻与电阻定律", catalogDescription: "ρL/A、材料电阻率、长度截面积和线性温度修正",
  configSchema: WireResistanceConfigSchema, patchSchema: WireResistancePatchSchema,
  schemaDoc: "physics.wire-resistance config：resistivityMicroOhmM为20°C电阻率[0.01,2]μΩ·m默认0.017；lengthM[0.1,20]m默认5；areaMM2[0.05,10]mm²默认1；temperatureC[-20,150]°C默认20；temperatureCoefficient[0,0.006]/°C默认0.0039；view=geometry|length|area|temperature默认geometry。均匀圆截面欧姆导线，R=ρ20[1+α(T−20)]L/A；温度近似不包含热膨胀、自发热或温度求解。默认数值为教学示例，不作为材料实测数据库。",
  patchHints: "比较单变量时保留其他参数；面积是mm²，不是直径。μΩ·m与mm²均含10^-6，读数R以Ω给出。此组件用于电阻定律；电池内阻与负载功率用physics.closed-circuit，理想双电阻串并联用physics.circuit-lab。",
};
