import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { heads: z.number().int().min(1).max(30), legs: z.number().int().min(0).max(120), view: z.enum(["animals", "equations"]), showSteps: z.boolean() };
export const ChickenRabbitConfigSchema = z.object({ heads: fields.heads.default(8), legs: fields.legs.default(22), view: fields.view.default("animals"), showSteps: fields.showSteps.default(true) }).strict();
export const ChickenRabbitPatchSchema = z.object(fields).partial().strict();
export type ChickenRabbitConfig = z.infer<typeof ChickenRabbitConfigSchema>;
export const DEFAULT_CHICKEN_RABBIT_CONFIG = ChickenRabbitConfigSchema.parse({});

export function computeChickenRabbit(config: ChickenRabbitConfig) {
  const extraLegs = config.legs - 2 * config.heads;
  const rabbits = extraLegs / 2;
  const chickens = config.heads - rabbits;
  const valid = Number.isInteger(rabbits) && rabbits >= 0 && chickens >= 0;
  return { valid, rabbits: valid ? rabbits : null, chickens: valid ? chickens : null, extraLegs, allChickenLegs: 2 * config.heads,
    reason: config.legs % 2 ? "odd-legs" : extraLegs < 0 ? "too-few" : chickens < 0 ? "too-many" : null };
}

export const chickenRabbitComponent: ImplementedComponent = {
  implemented: true, componentId: "math.chicken-rabbit", name: "鸡兔同笼与假设法", catalogDescription: "头脚约束、假设法、二元方程及无解条件",
  configSchema: ChickenRabbitConfigSchema, patchSchema: ChickenRabbitPatchSchema,
  schemaDoc: `math.chicken-rabbit config：heads 头数[1,30]整数 默认8；legs 脚数[0,120]整数 默认22；view=animals|equations 默认animals；showSteps 默认true。允许输入矛盾条件以解释无解；鸡2脚兔4脚。`,
  patchHints: "固定总头数，鸡换成兔会多2只脚。脚数必须偶数且位于2×heads到4×heads之间。无解时不取整伪造动物数量。",
};
