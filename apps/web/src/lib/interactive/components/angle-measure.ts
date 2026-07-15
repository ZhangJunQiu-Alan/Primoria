import { z } from "zod";
import type { ImplementedComponent } from "./types";

export const AngleMeasureConfigSchema = z.object({
  angleDeg: z.number().min(0).max(180).default(60),
  showClassification: z.boolean().default(true),
  showProtractor: z.boolean().default(false),
});
export type AngleMeasureConfig = z.infer<typeof AngleMeasureConfigSchema>;
export const AngleMeasurePatchSchema = z.object({ angleDeg: z.number().min(0).max(180), showClassification: z.boolean(), showProtractor: z.boolean() }).partial();
export const DEFAULT_ANGLE_MEASURE_CONFIG = AngleMeasureConfigSchema.parse({});

export function classifyAngle(angleDeg: number) {
  if (angleDeg === 0) return "零角";
  if (angleDeg < 90) return "锐角";
  if (angleDeg === 90) return "直角";
  if (angleDeg < 180) return "钝角";
  return "平角";
}

export const angleMeasureComponent: ImplementedComponent = {
  implemented: true, componentId: "math.angle-measure", name: "角度测量",
  catalogDescription: "拖动射线或滑块观察角度、分类与量角器刻度",
  configSchema: AngleMeasureConfigSchema, patchSchema: AngleMeasurePatchSchema,
  schemaDoc: `math.angle-measure 的 config 字段(全部字段都有默认值,只写有把握的字段):
- angleDeg: 角度大小,度,[0,180],默认 60
- showClassification: 是否显示锐角/直角/钝角分类,默认 true
- showProtractor: 是否显示量角器刻度,默认 false`,
  patchHints: `「一个锐角」取 90 以内(如 45);「直角」angleDeg=90;「钝角」取 90~180 之间(如 120);「再大一点」当前值约 +30%(不超过 180)。`,
};
