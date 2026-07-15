import { z } from "zod";
import type { ImplementedComponent } from "./types";

const harmonySchema = z.enum(["complementary", "analogous", "triadic"]);
export const ColorHarmonyConfigSchema = z.object({ baseHueDeg: z.number().min(0).max(359).default(30), harmony: harmonySchema.default("complementary"), saturationPct: z.number().min(10).max(100).default(70), lightnessPct: z.number().min(15).max(85).default(55) });
export type ColorHarmonyConfig = z.infer<typeof ColorHarmonyConfigSchema>;
export const ColorHarmonyPatchSchema = z.object({ baseHueDeg: z.number().min(0).max(359), harmony: harmonySchema, saturationPct: z.number().min(10).max(100), lightnessPct: z.number().min(15).max(85) }).partial();
export const DEFAULT_COLOR_HARMONY_CONFIG = ColorHarmonyConfigSchema.parse({});

const wrapHue = (hue: number) => (hue % 360 + 360) % 360;
export function deriveColorHarmony(config: ColorHarmonyConfig) {
  const offsets = config.harmony === "complementary" ? [0, 180] : config.harmony === "analogous" ? [-30, 0, 30] : [0, 120, 240];
  return offsets.map((offset) => ({ hueDeg: wrapHue(config.baseHueDeg + offset), css: `hsl(${wrapHue(config.baseHueDeg + offset)} ${config.saturationPct}% ${config.lightnessPct}%)` }));
}

export const colorHarmonyComponent: ImplementedComponent = {
  implemented: true, componentId: "arts.color-harmony", name: "色彩和声",
  catalogDescription: "在色轮上探索互补、类似与三角色彩关系",
  configSchema: ColorHarmonyConfigSchema, patchSchema: ColorHarmonyPatchSchema,
  schemaDoc: `arts.color-harmony 的 config 字段(全部字段都有默认值,只写有把握的字段):
- baseHueDeg: 基础色相,度,[0,359],默认 30(0 红、60 黄、120 绿、240 蓝)
- harmony: 和声关系,"complementary"(互补)|"analogous"(类似)|"triadic"(三角),默认 "complementary"
- saturationPct: 饱和度,%,[10,100],默认 70
- lightnessPct: 明度,%,[15,85],默认 55`,
  patchHints: `「更柔和/更灰」降低 saturationPct 约 30%;「亮一点」提高 lightnessPct;「换成蓝色系」baseHueDeg 取 240 附近;切换和声只改 harmony,不动基础色相。`,
};
