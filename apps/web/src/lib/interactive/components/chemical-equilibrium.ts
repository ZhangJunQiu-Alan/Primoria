import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { forwardRate: z.number().min(0.01).max(1), reverseRate: z.number().min(0.01).max(1), initialA: z.number().min(0).max(2), initialB: z.number().min(0).max(2), elapsedSeconds: z.number().min(0).max(60), view: z.enum(["concentrations", "rates"]), showEquilibrium: z.boolean() };
export const ChemicalEquilibriumConfigSchema = z.object({ forwardRate: fields.forwardRate.default(0.2), reverseRate: fields.reverseRate.default(0.1), initialA: fields.initialA.default(1), initialB: fields.initialB.default(0), elapsedSeconds: fields.elapsedSeconds.default(8), view: fields.view.default("concentrations"), showEquilibrium: fields.showEquilibrium.default(true) }).strict();
export const ChemicalEquilibriumPatchSchema = z.object(fields).partial().strict();
export type ChemicalEquilibriumConfig = z.infer<typeof ChemicalEquilibriumConfigSchema>;
export const DEFAULT_CHEMICAL_EQUILIBRIUM_CONFIG = ChemicalEquilibriumConfigSchema.parse({});

export function computeChemicalEquilibrium(config: ChemicalEquilibriumConfig) {
  const total = config.initialA + config.initialB;
  const relaxationRate = config.forwardRate + config.reverseRate;
  const equilibriumA = total * config.reverseRate / relaxationRate, equilibriumB = total - equilibriumA;
  const stateAt = (time: number) => {
    const a = Math.max(0, Math.min(total, equilibriumA + (config.initialA - equilibriumA) * Math.exp(-relaxationRate * time)));
    const b = total - a;
    return { a, b, forward: config.forwardRate * a, reverse: config.reverseRate * b };
  };
  return { total, equilibriumA, equilibriumB, equilibriumConstant: config.forwardRate / config.reverseRate, relaxationTime: 1 / relaxationRate, stateAt, current: stateAt(config.elapsedSeconds) };
}

export const chemicalEquilibriumComponent: ImplementedComponent = {
  implemented: true, componentId: "chem.chemical-equilibrium", name: "可逆反应动态平衡", catalogDescription: "A⇌B浓度与正逆速率、动态平衡和质量守恒",
  configSchema: ChemicalEquilibriumConfigSchema, patchSchema: ChemicalEquilibriumPatchSchema,
  schemaDoc: `chem.chemical-equilibrium config：forwardRate/reverseRate 一级正逆反应速率常数各[0.01,1]s⁻¹ 默认0.2/0.1；initialA/initialB 初始浓度各[0,2]M 默认1/0；elapsedSeconds [0,60]s 默认8；view=concentrations|rates 默认concentrations；showEquilibrium 默认true。封闭恒容A⇌B一比一模型，K=k正/k逆；不模拟气体压强改变或多反应物平衡。`,
  patchHints: "平衡时正逆速率相同而非反应停止；增加初始浓度不直接改变K。改变forwardRate或reverseRate才改变当前模型K。",
};
