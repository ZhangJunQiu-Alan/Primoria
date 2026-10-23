import { z } from "zod";
import type { ImplementedComponent } from "./types";

const coefficient = z.number().min(-10).max(10).multipleOf(0.1).refine((value) => Math.abs(value - Math.round(value * 10) / 10) <= Number.EPSILON * Math.abs(value) * 8, "Use increments of 0.1");
const fields = { a1: coefficient, b1: coefficient, c1: coefficient, a2: coefficient, b2: coefficient, c2: coefficient, view: z.enum(["graph", "elimination"]) };
export const LinearSystemConfigSchema = z.object({ a1: fields.a1.default(1), b1: fields.b1.default(1), c1: fields.c1.default(6), a2: fields.a2.default(2), b2: fields.b2.default(-1), c2: fields.c2.default(3), view: fields.view.default("graph") }).strict();
export const LinearSystemPatchSchema = z.object(fields).partial().strict();
export type LinearSystemConfig = z.infer<typeof LinearSystemConfigSchema>;
export const DEFAULT_LINEAR_SYSTEM_CONFIG = LinearSystemConfigSchema.parse({});

export function computeLinearSystem(config: LinearSystemConfig) {
  const [a, b, c, d, e, f] = [config.a1, config.b1, config.c1, config.a2, config.b2, config.c2].map((value) => Math.round(value * 10));
  const det = a * e - b * d;
  const zero1 = a === 0 && b === 0, zero2 = d === 0 && e === 0;
  const type: "inconsistent" | "all" | "line" | "unique" | "coincident" | "parallel" = zero1 && c !== 0 || zero2 && f !== 0 ? "inconsistent" : zero1 && zero2 ? "all" : zero1 || zero2 ? "line" : det !== 0 ? "unique" : a * f === c * d && b * f === c * e ? "coincident" : "parallel";
  const solution = type === "unique" ? { x: (c * e - b * f) / det, y: (a * f - c * d) / det } : null;
  const eliminateX = a !== 0 || d !== 0;
  const factor1 = eliminateX ? d : e, factor2 = eliminateX ? -a : -b;
  return { type, determinant: det / 100, solution, eliminateX, factor1: factor1 / 10, factor2: factor2 / 10,
    remainingCoefficient: (eliminateX ? factor1 * b + factor2 * e : factor1 * a + factor2 * d) / 100,
    remainingConstant: (factor1 * c + factor2 * f) / 100 };
}

export const linearSystemComponent: ImplementedComponent = {
  implemented: true, componentId: "math.linear-system", name: "二元一次方程组与消元", catalogDescription: "两直线交点、代数消元、平行重合与退化约束",
  configSchema: LinearSystemConfigSchema, patchSchema: LinearSystemPatchSchema,
  schemaDoc: "math.linear-system config：a1,b1,c1,a2,b2,c2各[-10,10]且为0.1的整数倍，对应a1x+b1y=c1与a2x+b2y=c2；默认1,1,6,2,-1,3。view=graph|elimination默认graph。使用十进制格点精确判别秩；图窗x,y∈[-8,8]，窗外解仍给出数值。",
  patchHints: "只改单个系数时保留其余方程。平行、重合、单条直线、全平面和0=非零的矛盾分别解释；不把行列式为零一概视为无解。",
};
