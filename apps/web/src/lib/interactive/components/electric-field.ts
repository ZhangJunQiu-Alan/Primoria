import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { charge1NC: z.number().min(-10).max(10), charge2NC: z.number().min(-10).max(10), separationM: z.number().min(0.2).max(2), probeX: z.number().min(-2).max(2), probeY: z.number().min(-1.5).max(1.5), view: z.enum(["field", "potential"]), showVectors: z.boolean() };
export const ElectricFieldConfigSchema = z.object({ charge1NC: fields.charge1NC.default(2), charge2NC: fields.charge2NC.default(-2), separationM: fields.separationM.default(1), probeX: fields.probeX.default(0), probeY: fields.probeY.default(0.5), view: fields.view.default("field"), showVectors: fields.showVectors.default(true) }).strict();
export const ElectricFieldPatchSchema = z.object(fields).partial().strict();
export type ElectricFieldConfig = z.infer<typeof ElectricFieldConfigSchema>;
export const DEFAULT_ELECTRIC_FIELD_CONFIG = ElectricFieldConfigSchema.parse({});

export function electricFieldAt(config: ElectricFieldConfig, x: number, y: number): { ex: number; ey: number; potential: number; magnitude: number } | null {
  let ex = 0, ey = 0, potential = 0;
  for (const [cx, charge] of [[-config.separationM / 2, config.charge1NC], [config.separationM / 2, config.charge2NC]]) {
    if (charge === 0) continue;
    const dx = x - cx, radius = Math.hypot(dx, y);
    if (radius < 1e-8) return null;
    const kq = 8.9875517923 * charge;
    ex += kq * dx / radius ** 3; ey += kq * y / radius ** 3; potential += kq / radius;
  }
  return { ex, ey, potential, magnitude: Math.hypot(ex, ey) };
}

export const electricFieldComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.electric-field", name: "双点电荷场与电势", catalogDescription: "点电荷场矢量叠加、偶极子与电势标量叠加",
  configSchema: ElectricFieldConfigSchema, patchSchema: ElectricFieldPatchSchema,
  schemaDoc: "physics.electric-field config：charge1NC/charge2NC各[-10,10]nC 默认2/-2；separationM [0.2,2]m 默认1；probeX [-2,2]m 默认0；probeY [-1.5,1.5]m 默认0.5；view=field|potential 默认field；showVectors 默认true。真空中两个固定理想点电荷；场源处未定义，箭头方向真实但长度经归一化，不是电场线或粒子轨迹。",
  patchHints: "偶极子取等量异号；同号取charge2NC与charge1NC同号。电势可为零但场不为零；探针是测试位置，不改变场源。",
};
