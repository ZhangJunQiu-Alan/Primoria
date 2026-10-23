import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { n1: z.number().min(0.8).max(2.5), n2: z.number().min(0.8).max(2.5), incidenceDeg: z.number().min(0).max(89.5),
  mode: z.enum(["rays", "reflectance"]), polarization: z.enum(["unpolarized", "s", "p"]), showAngles: z.boolean() };
export const RefractionLabConfigSchema = z.object({ n1: fields.n1.default(1), n2: fields.n2.default(1.5), incidenceDeg: fields.incidenceDeg.default(45),
  mode: fields.mode.default("rays"), polarization: fields.polarization.default("unpolarized"), showAngles: fields.showAngles.default(true) }).strict();
export const RefractionLabPatchSchema = z.object(fields).partial().strict();
export type RefractionLabConfig = z.infer<typeof RefractionLabConfigSchema>;
export const DEFAULT_REFRACTION_LAB_CONFIG = RefractionLabConfigSchema.parse({});

export function computeRefraction(config: Pick<RefractionLabConfig, "n1" | "n2" | "incidenceDeg" | "polarization">) {
  const { n1, n2, incidenceDeg, polarization } = config;
  const i = incidenceDeg * Math.PI / 180;
  const sinR = n1 / n2 * Math.sin(i);
  const totalInternalReflection = sinR >= 1;
  const r = totalInternalReflection ? null : Math.asin(Math.min(1, Math.max(0, sinR)));
  const criticalDeg = n1 > n2 ? Math.asin(n2 / n1) * 180 / Math.PI : null;
  const cosI = Math.cos(i);
  const cosR = r === null ? 0 : Math.cos(r);
  const rs = totalInternalReflection ? 1 : ((n1 * cosI - n2 * cosR) / (n1 * cosI + n2 * cosR)) ** 2;
  const rp = totalInternalReflection ? 1 : ((n2 * cosI - n1 * cosR) / (n2 * cosI + n1 * cosR)) ** 2;
  const reflectance = polarization === "s" ? rs : polarization === "p" ? rp : (rs + rp) / 2;
  return { refractionDeg: r === null ? null : r * 180 / Math.PI, totalInternalReflection, criticalDeg, reflectance,
    transmittance: 1 - reflectance, brewsterDeg: n1 === n2 ? null : Math.atan(n2 / n1) * 180 / Math.PI, speedRatio: n1 / n2 };
}

export const refractionLabComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.refraction-lab", name: "折射与全反射实验室", catalogDescription: "斯涅尔定律、临界角、全反射和偏振反射率",
  configSchema: RefractionLabConfigSchema, patchSchema: RefractionLabPatchSchema,
  schemaDoc: `physics.refraction-lab config：n1/n2 为第一/第二介质折射率 [0.8,2.5]，默认 1/1.5；incidenceDeg 为相对法线的入射角 [0,89.5]°，默认45；mode=rays|reflectance 默认rays；polarization=unpolarized|s|p 默认unpolarized；showAngles 默认true。理想无吸收界面，反射率使用菲涅耳公式。`,
  patchHints: "从水/玻璃射向空气需要 n1>n2；全反射必须满足入射角达到临界角。图中角度均相对法线，不是界面。",
};
