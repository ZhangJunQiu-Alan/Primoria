import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { leftForceN: z.number().min(0).max(100), rightForceN: z.number().min(0).max(100), leftArmM: z.number().min(0.1).max(2), rightArmM: z.number().min(0.1).max(2), showMoments: z.boolean() };
export const LeverBalanceConfigSchema = z.object({ leftForceN: fields.leftForceN.default(30), rightForceN: fields.rightForceN.default(20), leftArmM: fields.leftArmM.default(0.8), rightArmM: fields.rightArmM.default(1.2), showMoments: fields.showMoments.default(true) }).strict();
export const LeverBalancePatchSchema = z.object(fields).partial().strict();
export type LeverBalanceConfig = z.infer<typeof LeverBalanceConfigSchema>;
export const DEFAULT_LEVER_BALANCE_CONFIG = LeverBalanceConfigSchema.parse({});
export function computeLeverBalance(config: LeverBalanceConfig) {
  const leftMoment = config.leftForceN * config.leftArmM, rightMoment = config.rightForceN * config.rightArmM;
  const netMoment = leftMoment - rightMoment;
  return { leftMoment, rightMoment, netMoment, balanced: Math.abs(netMoment) < 1e-8, requiredRightForce: leftMoment / config.rightArmM };
}
export const leverBalanceComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.lever-balance", name: "杠杆力矩平衡", catalogDescription: "力与垂直力臂、力矩方向和杠杆平衡条件",
  configSchema: LeverBalanceConfigSchema, patchSchema: LeverBalancePatchSchema,
  schemaDoc: "physics.lever-balance config：leftForceN/rightForceN [0,100]N 默认30/20；leftArmM/rightArmM [0.1,2]m 默认0.8/1.2；showMoments 默认true。两力竖直向下、水平无质量杠杆、固定支点。显示初始合力矩趋势，不模拟真实摆角。",
  patchHints: "力臂是到力作用线的垂直距离；平衡要求leftForceN×leftArmM=rightForceN×rightArmM。",
};

const buoyancyFields = { objectDensity: z.number().min(100).max(3000), fluidDensity: z.number().min(500).max(1500), objectVolumeL: z.number().min(0.1).max(10), immersion: z.number().min(0).max(1), gravity: z.number().min(1).max(20), mode: z.enum(["held", "released"]) };
export const BuoyancyLabConfigSchema = z.object({ objectDensity: buoyancyFields.objectDensity.default(600), fluidDensity: buoyancyFields.fluidDensity.default(1000), objectVolumeL: buoyancyFields.objectVolumeL.default(1), immersion: buoyancyFields.immersion.default(0.8), gravity: buoyancyFields.gravity.default(9.8), mode: buoyancyFields.mode.default("held") }).strict();
export const BuoyancyLabPatchSchema = z.object(buoyancyFields).partial().strict();
export type BuoyancyLabConfig = z.infer<typeof BuoyancyLabConfigSchema>;
export const DEFAULT_BUOYANCY_LAB_CONFIG = BuoyancyLabConfigSchema.parse({});
export function computeBuoyancy(config: BuoyancyLabConfig) {
  const volumeM3 = config.objectVolumeL / 1000;
  const immersion = config.mode === "released" ? Math.min(1, config.objectDensity / config.fluidDensity) : config.immersion;
  const weight = config.objectDensity * volumeM3 * config.gravity;
  const buoyantForce = config.fluidDensity * volumeM3 * immersion * config.gravity;
  return { immersion, weight, buoyantForce, netUpward: buoyantForce - weight, displacedVolumeL: immersion * config.objectVolumeL,
    supportForce: weight - buoyantForce, floats: config.objectDensity < config.fluidDensity, neutral: config.objectDensity === config.fluidDensity,
    sunk: config.mode === "released" && config.objectDensity > config.fluidDensity };
}
export const buoyancyLabComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.buoyancy-lab", name: "阿基米德浮力与浮沉", catalogDescription: "排液体积、浮力重力、浸没比例与浮沉条件",
  configSchema: BuoyancyLabConfigSchema, patchSchema: BuoyancyLabPatchSchema,
  schemaDoc: "physics.buoyancy-lab config：objectDensity [100,3000]kg/m³ 默认600；fluidDensity [500,1500]默认1000；objectVolumeL [0.1,10]L 默认1；immersion [0,1]默认0.8；gravity [1,20]m/s²默认9.8；mode=held|released 默认held。held为外力控制浸入，released显示最终浮沉；沉底时计入底部支持力，无流体阻力动画。",
  patchHints: "浮力由液体密度和排液体积决定。released且ρ物<ρ液时浸没比例ρ物/ρ液；沉底时浮力不一定等于重力。",
};
