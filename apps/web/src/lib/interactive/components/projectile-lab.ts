import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { speed: z.number().min(0).max(50), angleDeg: z.number().min(0).max(90), launchHeight: z.number().min(0).max(30), gravity: z.number().min(1).max(20), drag: z.number().min(0).max(1.5), progress: z.number().min(0).max(1), showVelocity: z.boolean() };
export const ProjectileLabConfigSchema = z.object({ speed: fields.speed.default(20), angleDeg: fields.angleDeg.default(45), launchHeight: fields.launchHeight.default(0), gravity: fields.gravity.default(9.8), drag: fields.drag.default(0), progress: fields.progress.default(0.5), showVelocity: fields.showVelocity.default(true) }).strict();
export const ProjectileLabPatchSchema = z.object(fields).partial().strict();
export type ProjectileLabConfig = z.infer<typeof ProjectileLabConfigSchema>;
export const DEFAULT_PROJECTILE_LAB_CONFIG = ProjectileLabConfigSchema.parse({});

export function projectileState(config: ProjectileLabConfig, time: number) {
  const a = config.angleDeg * Math.PI / 180;
  const vx0 = config.speed * Math.cos(a), vy0 = config.speed * Math.sin(a);
  const { drag: k, gravity: g, launchHeight: h } = config;
  if (k === 0) return { x: vx0 * time, y: h + vy0 * time - g * time * time / 2, vx: vx0, vy: vy0 - g * time };
  const z = k * time, e = Math.exp(-z);
  const first = Math.abs(z) < 1e-5 ? 1 - z / 2 + z * z / 6 - z ** 3 / 24 : -Math.expm1(-z) / z;
  const second = Math.abs(z) < 1e-4 ? 0.5 - z / 6 + z * z / 24 - z ** 3 / 120 : (z + Math.expm1(-z)) / (z * z);
  return { x: vx0 * time * first, y: h + vy0 * time * first - g * time * time * second,
    vx: vx0 * e, vy: vy0 * e - g * time * first };
}

export function computeProjectile(config: ProjectileLabConfig) {
  const vy = config.speed * Math.sin(config.angleDeg * Math.PI / 180);
  let flightTime: number;
  if (config.drag === 0) flightTime = (vy + Math.sqrt(vy * vy + 2 * config.gravity * config.launchHeight)) / config.gravity;
  else if (config.launchHeight === 0 && vy === 0) flightTime = 0;
  else {
    const apex = Math.log1p(config.drag * vy / config.gravity) / config.drag;
    let lo = apex, hi = Math.max(1, apex + 1);
    while (projectileState(config, hi).y > 0) hi *= 2;
    for (let i = 0; i < 70; i++) { const mid = (lo + hi) / 2; if (projectileState(config, mid).y > 0) lo = mid; else hi = mid; }
    flightTime = (lo + hi) / 2;
  }
  const apexTime = config.drag === 0 ? vy / config.gravity : Math.log1p(config.drag * vy / config.gravity) / config.drag;
  const trajectory = Array.from({ length: 101 }, (_, i) => projectileState(config, flightTime * i / 100));
  const current = projectileState(config, config.progress * flightTime);
  return { flightTime, range: projectileState(config, flightTime).x, maxHeight: projectileState(config, apexTime).y,
    time: config.progress * flightTime, current, trajectory };
}

export const projectileLabComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.projectile-lab", name: "平抛与斜抛实验室", catalogDescription: "平抛斜抛、速度分解、重力与线性阻力对照",
  configSchema: ProjectileLabConfigSchema, patchSchema: ProjectileLabPatchSchema,
  schemaDoc: `physics.projectile-lab config：speed 初速[0,50]m/s 默认20；angleDeg 仰角[0,90]° 默认45，平抛取0；launchHeight 初始高度[0,30]m 默认0；gravity [1,20]m/s² 默认9.8；drag 线性阻力系数/质量[0,1.5]s⁻¹ 默认0；progress 飞行进度[0,1]默认0.5；showVelocity 默认true。水平地面，无风，线性阻力模型。`,
  patchHints: "月球重力用1.62；平抛 angleDeg=0 且 launchHeight>0；关闭空气阻力 drag=0；比较角度时保持 speed/gravity 不变。",
};
