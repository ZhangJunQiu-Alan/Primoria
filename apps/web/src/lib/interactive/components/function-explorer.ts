import { z } from "zod";
import type { ImplementedComponent } from "./types";

const functionTypeSchema = z.enum(["quadratic", "sin", "abs", "sqrt"]);
export const FunctionExplorerConfigSchema = z.object({
  functionType: functionTypeSchema.default("quadratic"),
  a: z.number().min(-3).max(3).default(1), b: z.number().min(0.25).max(4).default(1),
  h: z.number().min(-5).max(5).default(0), k: z.number().min(-5).max(5).default(0),
  showOriginal: z.boolean().default(true),
});
export type FunctionExplorerConfig = z.infer<typeof FunctionExplorerConfigSchema>;
export const FunctionExplorerPatchSchema = z.object({
  functionType: functionTypeSchema, a: z.number().min(-3).max(3), b: z.number().min(0.25).max(4),
  h: z.number().min(-5).max(5), k: z.number().min(-5).max(5), showOriginal: z.boolean(),
}).partial();
export const DEFAULT_FUNCTION_EXPLORER_CONFIG = FunctionExplorerConfigSchema.parse({});

export function evaluateBaseFunction(type: FunctionExplorerConfig["functionType"], x: number): number | null {
  if (type === "quadratic") return x * x;
  if (type === "sin") return Math.sin(x);
  if (type === "abs") return Math.abs(x);
  return x < 0 ? null : Math.sqrt(x);
}
export function evaluateTransformedFunction(config: FunctionExplorerConfig, x: number): number | null {
  const base = evaluateBaseFunction(config.functionType, config.b * (x - config.h));
  return base === null ? null : config.a * base + config.k;
}

export const functionExplorerComponent: ImplementedComponent = {
  implemented: true, componentId: "math.function-explorer", name: "函数变换探索",
  catalogDescription: "探索 y=a·f(b(x-h))+k 的平移、伸缩与翻折",
  configSchema: FunctionExplorerConfigSchema, patchSchema: FunctionExplorerPatchSchema,
  schemaDoc: `math.function-explorer 的 config 字段,模型 y = a·f(b(x−h)) + k(全部字段都有默认值,只写有把握的字段):
- functionType: 母函数 f,"quadratic"(x²)|"sin"|"abs"(|x|)|"sqrt"(√x),默认 "quadratic"
- a: 纵向伸缩/翻折,[-3,3],默认 1
- b: 横向伸缩,[0.25,4],默认 1
- h: 水平平移(右移为正),[-5,5],默认 0
- k: 垂直平移(上移为正),[-5,5],默认 0
- showOriginal: 是否用虚线显示母函数原型,默认 true`,
  patchHints: `「右移 n 个单位」h 增加 n;「上移 n 个单位」k 增加 n;「关于 x 轴翻折/开口向下」a 取负;「更瘦/更陡」b 或 |a| 约 +30%。`,
};
