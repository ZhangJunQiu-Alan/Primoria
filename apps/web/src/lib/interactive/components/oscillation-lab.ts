import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { system: z.enum(["spring", "pendulum"]), massKg: z.number().min(0.1).max(5), stiffness: z.number().min(1).max(80), lengthM: z.number().min(0.2).max(3), amplitudeM: z.number().min(0.02).max(1), angleDeg: z.number().min(1).max(30), elapsedSeconds: z.number().min(0).max(20) };
export const OscillationLabConfigSchema = z.object({ system: fields.system.default("spring"), massKg: fields.massKg.default(1), stiffness: fields.stiffness.default(10), lengthM: fields.lengthM.default(1), amplitudeM: fields.amplitudeM.default(0.3), angleDeg: fields.angleDeg.default(15), elapsedSeconds: fields.elapsedSeconds.default(0) }).strict();
export const OscillationLabPatchSchema = z.object(fields).partial().strict();
export type OscillationLabConfig = z.infer<typeof OscillationLabConfigSchema>;
export const DEFAULT_OSCILLATION_LAB_CONFIG = OscillationLabConfigSchema.parse({});

export function computeOscillation(config: OscillationLabConfig) {
  const g = 9.8, t = config.elapsedSeconds;
  if (config.system === "spring") {
    const omega = Math.sqrt(config.stiffness / config.massKg);
    const displacement = config.amplitudeM * Math.cos(omega * t), velocity = -config.amplitudeM * omega * Math.sin(omega * t);
    return { period: 2 * Math.PI / omega, displacement, velocity, angle: 0, angularVelocity: 0,
      potential: 0.5 * config.stiffness * displacement ** 2, kinetic: 0.5 * config.massKg * velocity ** 2,
      totalEnergy: 0.5 * config.stiffness * config.amplitudeM ** 2 };
  }
  const amplitude = config.angleDeg * Math.PI / 180;
  let agmA = 1, agmB = Math.cos(amplitude / 2);
  for (let i = 0; i < 10; i++) { const a = (agmA + agmB) / 2; agmB = Math.sqrt(agmA * agmB); agmA = a; }
  const period = 2 * Math.PI * Math.sqrt(config.lengthM / g) / agmA;
  let angle = amplitude, angularVelocity = 0;
  const steps = Math.max(1, Math.ceil(t / 0.004)), dt = t / steps;
  const acceleration = (theta: number) => -g / config.lengthM * Math.sin(theta);
  for (let i = 0; i < steps; i++) {
    const oldAcceleration = acceleration(angle);
    angle += angularVelocity * dt + oldAcceleration * dt * dt / 2;
    angularVelocity += (oldAcceleration + acceleration(angle)) * dt / 2;
  }
  const potential = config.massKg * g * config.lengthM * (1 - Math.cos(angle));
  const kinetic = config.massKg * (config.lengthM * angularVelocity) ** 2 / 2;
  return { period, displacement: config.lengthM * Math.sin(angle), velocity: config.lengthM * angularVelocity,
    angle, angularVelocity, potential, kinetic, totalEnergy: config.massKg * g * config.lengthM * (1 - Math.cos(amplitude)) };
}

export const oscillationLabComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.oscillation-lab", name: "弹簧与单摆振动", catalogDescription: "弹簧振子、非线性单摆、周期与动势能转化",
  configSchema: OscillationLabConfigSchema, patchSchema: OscillationLabPatchSchema,
  schemaDoc: `physics.oscillation-lab config：system=spring|pendulum 默认spring；massKg [0.1,5]kg 默认1；stiffness [1,80]N/m 默认10；lengthM [0.2,3]m 默认1；amplitudeM 弹簧振幅[0.02,1]m 默认0.3；angleDeg 单摆角振幅[1,30]° 默认15；elapsedSeconds [0,20]s 默认0。无阻尼、无驱动；单摆用非线性方程和真实振幅相关周期。`,
  patchHints: "弹簧周期随sqrt(m/k)变化；单摆周期不依赖质量；单摆振幅用angleDeg，弹簧用amplitudeM。不要用此组件承诺阻尼或共振。",
};
