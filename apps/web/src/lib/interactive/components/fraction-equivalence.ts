import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { numerator: z.number().int().min(0).max(12), denominator: z.number().int().min(1).max(12), factor: z.number().int().min(1).max(6), view: z.enum(["area", "numberline"]), showDecimal: z.boolean() };
export const FractionEquivalenceConfigSchema = z.object({ numerator: fields.numerator.default(2), denominator: fields.denominator.default(3), factor: fields.factor.default(2), view: fields.view.default("area"), showDecimal: fields.showDecimal.default(true) }).strict();
export const FractionEquivalencePatchSchema = z.object(fields).partial().strict();
export type FractionEquivalenceConfig = z.infer<typeof FractionEquivalenceConfigSchema>;
export const DEFAULT_FRACTION_EQUIVALENCE_CONFIG = FractionEquivalenceConfigSchema.parse({});

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

export function computeFractionEquivalence(config: FractionEquivalenceConfig) {
  const { numerator: n, denominator: d, factor: f } = config;
  const divisor = gcd(n, d);
  return { value: n / d, equivalentNumerator: n * f, equivalentDenominator: d * f, simplifiedNumerator: n / divisor,
    simplifiedDenominator: d / divisor, whole: Math.floor(n / d), remainder: n % d };
}

export const fractionEquivalenceComponent: ImplementedComponent = {
  implemented: true, componentId: "math.fraction-equivalence", name: "分数与等值分割", catalogDescription: "面积与数轴联动，分数等值、约分和假分数",
  configSchema: FractionEquivalenceConfigSchema, patchSchema: FractionEquivalencePatchSchema,
  schemaDoc: `math.fraction-equivalence config：numerator 分子[0,12]整数 默认2；denominator 分母[1,12]整数 默认3；factor 等分倍数[1,6]整数 默认2；view=area|numberline 默认area；showDecimal 默认true。支持假分数，不执行分数四则运算。`,
  patchHints: "等值扩分要同时乘分子和分母；factor 改变分割细度而不改变分数大小；零分母不允许。",
};
