import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { totalConcentration: z.number().min(0).max(1), pKa: z.number().min(1).max(12), saltFraction: z.number().min(0).max(1), addedBaseMM: z.number().min(-100).max(100), view: z.enum(["composition", "response"]), showCapacity: z.boolean() };
export const WeakAcidBufferConfigSchema = z.object({ totalConcentration: fields.totalConcentration.default(0.1), pKa: fields.pKa.default(4.76), saltFraction: fields.saltFraction.default(0.5), addedBaseMM: fields.addedBaseMM.default(0), view: fields.view.default("composition"), showCapacity: fields.showCapacity.default(true) }).strict();
export const WeakAcidBufferPatchSchema = z.object(fields).partial().strict();
export type WeakAcidBufferConfig = z.infer<typeof WeakAcidBufferConfigSchema>;
export const DEFAULT_WEAK_ACID_BUFFER_CONFIG = WeakAcidBufferConfigSchema.parse({});

export function computeWeakAcidBuffer(config: WeakAcidBufferConfig, addedBaseMM = config.addedBaseMM) {
  const ka = 10 ** -config.pKa, kw = 1e-14;
  const strongIonBalance = config.totalConcentration * config.saltFraction + addedBaseMM / 1000;
  const balance = (h: number) => h + strongIonBalance - config.totalConcentration * ka / (ka + h) - kw / h;
  let low = -16, high = 1;
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2;
    if (balance(10 ** middle) > 0) high = middle; else low = middle;
  }
  const h = 10 ** ((low + high) / 2), oh = kw / h;
  const fractionA = ka / (ka + h), a = config.totalConcentration * fractionA, ha = config.totalConcentration * h / (ka + h);
  const capacity = Math.LN10 * (config.totalConcentration * ka * h / (ka + h) ** 2 + h + oh);
  return { pH: -Math.log10(h), h, oh, a, ha, ka, fractionA, capacity, strongIonBalance, chargeResidual: balance(h) };
}

export const weakAcidBufferComponent: ImplementedComponent = {
  implemented: true, componentId: "chem.weak-acid-buffer", name: "弱酸解离与缓冲响应", catalogDescription: "单元弱酸、共轭碱、酸碱扰动、电荷与物料守恒",
  configSchema: WeakAcidBufferConfigSchema, patchSchema: WeakAcidBufferPatchSchema,
  schemaDoc: "chem.weak-acid-buffer config：totalConcentration总分析浓度[0,1]mol/L默认0.1；pKa[1,12]默认4.76；saltFraction初始共轭碱盐占总酸比例[0,1]默认0.5；addedBaseMM强碱当量浓度[-100,100]mmol/L默认0，负数表示强酸；view=composition|response默认composition；showCapacity默认true。25°C理想单元弱酸、固定体积、不考虑活度，以电荷和物料守恒求解，含水自解离。",
  patchHints: "酸/盐比例接近1:1时比较缓冲响应；降低总浓度时容量变弱；极稀溶液需包含水。addedBaseMM是固定体积浓度当量，不是滴入体积；不用于多元酸或真实高浓度活度计算。",
};
