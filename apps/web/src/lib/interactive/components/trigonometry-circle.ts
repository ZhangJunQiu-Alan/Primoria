import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { angleDeg: z.number().min(-720).max(720), radius: z.number().min(0.5).max(3), mode: z.enum(["circle", "graph"]), functionType: z.enum(["sin", "cos", "tan"]), showProjection: z.boolean(), showTangent: z.boolean() };
export const TrigonometryCircleConfigSchema = z.object({ angleDeg: fields.angleDeg.default(40), radius: fields.radius.default(1), mode: fields.mode.default("circle"), functionType: fields.functionType.default("sin"), showProjection: fields.showProjection.default(true), showTangent: fields.showTangent.default(false) }).strict();
export const TrigonometryCirclePatchSchema = z.object(fields).partial().strict();
export type TrigonometryCircleConfig = z.infer<typeof TrigonometryCircleConfigSchema>;
export const DEFAULT_TRIGONOMETRY_CIRCLE_CONFIG = TrigonometryCircleConfigSchema.parse({});

export function computeTrigonometry(config: TrigonometryCircleConfig) {
  const radians = config.angleDeg * Math.PI / 180;
  const sin = Math.sin(radians), cos = Math.cos(radians);
  return { radians, sin, cos, tan: Math.abs(cos) < 1e-10 ? null : sin / cos, x: config.radius * cos, y: config.radius * sin,
    normalizedAngle: ((config.angleDeg % 360) + 360) % 360 };
}

export const trigonometryCircleComponent: ImplementedComponent = {
  implemented: true, componentId: "math.trigonometry-circle", name: "三角函数与单位圆", catalogDescription: "单位圆投影、正弦余弦正切、象限与周期",
  configSchema: TrigonometryCircleConfigSchema, patchSchema: TrigonometryCirclePatchSchema,
  schemaDoc: `math.trigonometry-circle config：angleDeg [-720,720]° 默认40；radius [0.5,3] 默认1；mode=circle|graph 默认circle；functionType=sin|cos|tan 默认sin；showProjection 默认true；showTangent 默认false。三角函数是坐标/半径的比值；正切奇点显示未定义。`,
  patchHints: "角度增加360°后正弦余弦不变；正切周期180°；改变radius不改变三角函数比值。不要在90°或270°生成有限tan值。",
};
