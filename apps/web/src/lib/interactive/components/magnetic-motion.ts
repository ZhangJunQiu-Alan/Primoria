import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { particle: z.enum(["electron", "proton"]), fieldMT: z.number().min(0.1).max(10), speedMillion: z.number().min(0.1).max(10), pitchDeg: z.number().min(0).max(90), turns: z.number().min(0).max(3), view: z.enum(["transverse", "helix"]), showVelocity: z.boolean() };
export const MagneticMotionConfigSchema = z.object({ particle: fields.particle.default("electron"), fieldMT: fields.fieldMT.default(1), speedMillion: fields.speedMillion.default(1), pitchDeg: fields.pitchDeg.default(90), turns: fields.turns.default(0.75), view: fields.view.default("transverse"), showVelocity: fields.showVelocity.default(true) }).strict();
export const MagneticMotionPatchSchema = z.object(fields).partial().strict();
export type MagneticMotionConfig = z.infer<typeof MagneticMotionConfigSchema>;
export const DEFAULT_MAGNETIC_MOTION_CONFIG = MagneticMotionConfigSchema.parse({});

export function computeMagneticMotion(config: MagneticMotionConfig) {
  const q = 1.602176634e-19, mass = config.particle === "electron" ? 9.1093837139e-31 : 1.67262192595e-27;
  const sign = config.particle === "electron" ? -1 : 1;
  const speed = config.speedMillion * 1e6, angle = config.pitchDeg * Math.PI / 180;
  const transverse = config.pitchDeg === 0 ? 0 : speed * Math.sin(angle);
  const parallel = config.pitchDeg === 90 ? 0 : speed * Math.cos(angle);
  const omega = q * config.fieldMT * 1e-3 / mass;
  const period = 2 * Math.PI / omega, radius = transverse / omega;
  const stateAtTurns = (turns: number) => {
    const phase = turns * 2 * Math.PI;
    return { x: radius === 0 ? 0 : radius * Math.sin(phase), y: radius === 0 ? 0 : -sign * radius * (1 - Math.cos(phase)), z: parallel * period * turns,
      vx: transverse * Math.cos(phase), vy: -sign * transverse * Math.sin(phase), vz: parallel };
  };
  return { mass, sign, speed, transverse, parallel, omega, period, radius, pitch: parallel * period, time: config.turns * period,
    stateAtTurns, current: stateAtTurns(config.turns), kineticEnergy: mass * speed * speed / 2 };
}

export const magneticMotionComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.magnetic-motion", name: "带电粒子磁场运动", catalogDescription: "洛伦兹力、圆周与螺旋轨迹、周期和旋向",
  configSchema: MagneticMotionConfigSchema, patchSchema: MagneticMotionPatchSchema,
  schemaDoc: "physics.magnetic-motion config：particle=electron|proton 默认electron；fieldMT [0.1,10]mT 默认1；speedMillion [0.1,10]×10⁶m/s 默认1；pitchDeg 速度与B夹角[0,90]°默认90；turns [0,3]回旋周期默认0.75；view=transverse|helix 默认transverse；showVelocity 默认true。B沿+z，初始垂直速度沿+x；非相对论匀强磁场、无电场。",
  patchHints: "速度平行B时直线运动，垂直时圆周；电子和质子旋向相反但质量也不同。增大B减小周期与半径，磁场不做功。",
};
