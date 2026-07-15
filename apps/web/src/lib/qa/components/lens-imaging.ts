import { z } from "zod";
import type { ImplementedComponent } from "./types";

// physics.lens-imaging — 薄透镜成像。声明式组件样板:config schema、纯计算、
// LLM schema 文档三者同源于此文件;React 渲染在
// apps/web/src/app/qa/declarative-lens/widgets/lens-imaging.tsx。

export const LensImagingConfigSchema = z.object({
  lensType: z.enum(["convex", "concave"]).default("convex"),
  /** 焦距,cm */
  focalLength: z.number().min(4).max(30).default(10),
  /** 物距,cm */
  objectDistance: z.number().min(2).max(60).default(30),
  /** 物高,cm */
  objectHeight: z.number().min(3).max(16).default(8),
  showRays: z.boolean().default(true),
});

export type LensImagingConfig = z.infer<typeof LensImagingConfigSchema>;

export const LensImagingPatchSchema = z
  .object({
    lensType: z.enum(["convex", "concave"]),
    focalLength: z.number().min(4).max(30),
    objectDistance: z.number().min(2).max(60),
    objectHeight: z.number().min(3).max(16),
    showRays: z.boolean(),
  })
  .partial();

export type LensImagingPatch = z.infer<typeof LensImagingPatchSchema>;

export const DEFAULT_LENS_CONFIG: LensImagingConfig = LensImagingConfigSchema.parse({});

export type LensImageResult =
  | { none: true }
  | {
      none: false;
      /** 像距(正 = 实像,负 = 虚像),cm */
      v: number;
      /** 放大率(负 = 倒立) */
      m: number;
      real: boolean;
    };

/** 薄透镜成像:1/f = 1/u + 1/v(实正虚负;凹透镜 f 取负)。 */
export function computeLensImage(
  config: Pick<LensImagingConfig, "lensType" | "focalLength" | "objectDistance">,
): LensImageResult {
  const f = config.lensType === "convex" ? config.focalLength : -config.focalLength;
  const u = config.objectDistance;
  if (Math.abs(u - f) < 0.05) return { none: true };
  const v = (f * u) / (u - f);
  const m = -v / u;
  return { none: false, v, m, real: v > 0 };
}

export const lensImagingComponent: ImplementedComponent = {
  implemented: true,
  componentId: "physics.lens-imaging",
  name: "透镜成像",
  catalogDescription: "凸/凹薄透镜成像:物距、焦距、三条特殊光线、实虚像与放大率",
  configSchema: LensImagingConfigSchema,
  patchSchema: LensImagingPatchSchema,
  schemaDoc: `physics.lens-imaging 的 config 字段(全部字段都有默认值,只写有把握的字段):
- lensType: "convex"(凸透镜)| "concave"(凹透镜),默认 "convex"
- focalLength: 焦距 cm,范围 [4, 30],默认 10
- objectDistance: 物距 cm,范围 [2, 60],默认 30
- objectHeight: 物高 cm,范围 [3, 16],默认 8
- showRays: 是否画特殊光线,默认 true`,
  patchHints: `「焦点以内」指 objectDistance < focalLength;「调大/调小一点」按当前值的约 30% 增减;数值超出范围时取最近的边界值。`,
};
