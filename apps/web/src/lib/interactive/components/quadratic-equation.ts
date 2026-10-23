import { z } from "zod";
import type { ImplementedComponent } from "./types";

const onGrid = (value: number) => Math.abs(value - Math.round(value * 100) / 100) <= Number.EPSILON * Math.abs(value) * 8;
const fields = { a: z.number().min(-4).max(4).multipleOf(0.01).refine(onGrid, "Use increments of 0.01"), b: z.number().min(-8).max(8).multipleOf(0.01).refine(onGrid, "Use increments of 0.01"), c: z.number().min(-8).max(8).multipleOf(0.01).refine(onGrid, "Use increments of 0.01"), view: z.enum(["roots", "vertex"]), showAxis: z.boolean(), domain: z.enum(["real", "complex"]) };
export const QuadraticEquationConfigSchema = z.object({ a: fields.a.default(1), b: fields.b.default(-2), c: fields.c.default(-3), view: fields.view.default("roots"), showAxis: fields.showAxis.default(true), domain: fields.domain.default("real") }).strict();
export const QuadraticEquationPatchSchema = z.object(fields).partial().strict();
export type QuadraticEquationConfig = z.infer<typeof QuadraticEquationConfigSchema>;
export const DEFAULT_QUADRATIC_EQUATION_CONFIG = QuadraticEquationConfigSchema.parse({});

export function solveQuadraticCoefficients(a: number, b: number, c: number) {
  const A = Math.round(a * 100), B = Math.round(b * 100), C = Math.round(c * 100);
  if (A === 0) return { kind: B !== 0 ? "linear" : C === 0 ? "identity" : "inconsistent", discriminant: null, roots: B !== 0 ? [-C / B] : [], vertex: null, complex: null };
  const d = B * B - 4 * A * C, discriminant = d / 10000;
  const vertex = { x: -B / (2 * A), y: -d / (400 * A) };
  if (d < 0) return { kind: "complex", discriminant, roots: [], vertex, complex: { real: -B / (2 * A), imaginary: Math.sqrt(-d) / (2 * Math.abs(A)) } };
  if (d === 0) return { kind: "repeated", discriminant, roots: [-B / (2 * A)], vertex, complex: null };
  const q = -0.5 * (B + (B >= 0 ? 1 : -1) * Math.sqrt(d));
  return { kind: "real", discriminant, roots: [q / A, C / q].sort((x, y) => x - y), vertex, complex: null };
}

export function computeQuadraticEquation(config: QuadraticEquationConfig) {
  return solveQuadraticCoefficients(config.a, config.b, config.c);
}

export const quadraticEquationComponent: ImplementedComponent = {
  implemented: true, componentId: "math.quadratic-equation", name: "二次方程的根与顶点", catalogDescription: "判别式、实根复根、配方顶点与一次退化",
  configSchema: QuadraticEquationConfigSchema, patchSchema: QuadraticEquationPatchSchema,
  schemaDoc: "math.quadratic-equation config：a[-4,4]默认1；b,c[-8,8]默认-2,-3；三个系数为0.01的整数倍。view=roots|vertex默认roots；showAxis默认true；domain=real|complex默认real（初中默认实数范围）。方程ax²+bx+c=0；a=0时明确转为一次/恒等/矛盾。视窗随附近实根与顶点自适应，极远根保留读数；只在实平面标实根；复根单独写a±bi。",
  patchHints: "改变c观察实根合并并进入复根；配方观察顶点与对称轴。不是任意高次方程求根器，不把a=0继续代入二次求根式。",
};
