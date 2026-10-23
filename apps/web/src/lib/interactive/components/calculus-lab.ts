import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = {
  functionType: z.enum(["cubic", "quadratic", "sine", "exponential", "absolute"]),
  mode: z.enum(["secant", "tangent", "integral"]),
  x0: z.number().min(-2).max(2),
  deltaX: z.number().min(-2).max(2),
  coefficient: z.number().min(0.2).max(2),
  intervalEnd: z.number().min(-2).max(2),
  subdivisions: z.number().int().min(2).max(80),
};
export const CalculusLabConfigSchema = z.object({
  functionType: fields.functionType.default("cubic"), mode: fields.mode.default("secant"),
  x0: fields.x0.default(1), deltaX: fields.deltaX.default(0.5), coefficient: fields.coefficient.default(1),
  intervalEnd: fields.intervalEnd.default(2), subdivisions: fields.subdivisions.default(12),
}).strict();
export const CalculusLabPatchSchema = z.object(fields).partial().strict();
export type CalculusLabConfig = z.infer<typeof CalculusLabConfigSchema>;
export const DEFAULT_CALCULUS_LAB_CONFIG = CalculusLabConfigSchema.parse({});

export function calculusValue(type: CalculusLabConfig["functionType"], x: number, coefficient = 1) {
  const y = type === "cubic" ? x ** 3 - 3 * x : type === "quadratic" ? x * x : type === "sine" ? Math.sin(x) : type === "exponential" ? Math.exp(x) : Math.abs(x);
  return coefficient * y;
}

export function calculusDerivative(type: CalculusLabConfig["functionType"], x: number, coefficient = 1): number | null {
  if (type === "absolute" && x === 0) return null;
  return coefficient * (type === "cubic" ? 3 * x * x - 3 : type === "quadratic" ? 2 * x : type === "sine" ? Math.cos(x) : type === "exponential" ? Math.exp(x) : Math.sign(x));
}

function primitive(type: CalculusLabConfig["functionType"], x: number) {
  return type === "cubic" ? x ** 4 / 4 - 1.5 * x * x : type === "quadratic" ? x ** 3 / 3 : type === "sine" ? -Math.cos(x) : type === "exponential" ? Math.exp(x) : x * Math.abs(x) / 2;
}

export function computeCalculus(config: CalculusLabConfig) {
  const { functionType: type, x0: a, intervalEnd: b, coefficient: c, deltaX: h, subdivisions: n } = config;
  const derivative = calculusDerivative(type, a, c);
  const secant = h === 0 ? null : (calculusValue(type, a + h, c) - calculusValue(type, a, c)) / h;
  const dx = (b - a) / n;
  const rectangles = Array.from({ length: n }, (_, i) => ({ left: a + i * dx, right: a + (i + 1) * dx, height: calculusValue(type, a + (i + 0.5) * dx, c) }));
  return { derivative, secant, error: derivative === null || secant === null ? null : Math.abs(secant - derivative),
    exactIntegral: c * (primitive(type, b) - primitive(type, a)),
    midpointIntegral: rectangles.reduce((sum, r) => sum + r.height * dx, 0), rectangles };
}

export const calculusLabComponent: ImplementedComponent = {
  implemented: true, componentId: "math.calculus-lab", name: "导数与积分实验室",
  catalogDescription: "割线趋近切线、瞬时变化率与有向面积累积",
  configSchema: CalculusLabConfigSchema, patchSchema: CalculusLabPatchSchema,
  schemaDoc: `math.calculus-lab config（全部有默认值）：functionType=cubic|quadratic|sine|exponential|absolute；cubic 表示 x³−3x。mode=secant|tangent|integral；x0∈[-2,2]；deltaX∈[-2,2]，零时显示割线未定义；coefficient∈[0.2,2]；intervalEnd∈[-2,2]；subdivisions 为 [2,80] 整数。默认 cubic/secant/x0=1/deltaX=0.5/coefficient=1/intervalEnd=2/subdivisions=12。`,
  patchHints: "缩小 Δx 改 deltaX；切线改 mode=tangent；面积/黎曼和改 integral。绝对值函数在 0 处不可导，不伪造斜率。",
};
