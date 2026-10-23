import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { order: z.enum(["zero", "first", "second"]), initialConcentration: z.number().min(0.1).max(2), referenceRate: z.number().min(0.01).max(1), temperatureK: z.number().min(273).max(373), activationEnergyKJ: z.number().min(10).max(100), elapsedSeconds: z.number().min(0).max(60), showHalfLife: z.boolean() };
export const ReactionKineticsConfigSchema = z.object({ order: fields.order.default("first"), initialConcentration: fields.initialConcentration.default(1), referenceRate: fields.referenceRate.default(0.1), temperatureK: fields.temperatureK.default(298), activationEnergyKJ: fields.activationEnergyKJ.default(50), elapsedSeconds: fields.elapsedSeconds.default(5), showHalfLife: fields.showHalfLife.default(true) }).strict();
export const ReactionKineticsPatchSchema = z.object(fields).partial().strict();
export type ReactionKineticsConfig = z.infer<typeof ReactionKineticsConfigSchema>;
export const DEFAULT_REACTION_KINETICS_CONFIG = ReactionKineticsConfigSchema.parse({});

export function computeReactionKinetics(config: ReactionKineticsConfig) {
  const { order, initialConcentration: c0 } = config;
  const rateConstant = config.referenceRate * Math.exp(config.activationEnergyKJ * 1000 / 8.314462618 * (1 / 298 - 1 / config.temperatureK));
  const concentrationAt = (time: number) => order === "zero" ? Math.max(0, c0 - rateConstant * time) : order === "first" ? c0 * Math.exp(-rateConstant * time) : c0 / (1 + rateConstant * c0 * time);
  const concentration = concentrationAt(config.elapsedSeconds);
  const halfLife = order === "zero" ? c0 / (2 * rateConstant) : order === "first" ? Math.LN2 / rateConstant : 1 / (rateConstant * c0);
  const rate = concentration === 0 ? 0 : rateConstant * concentration ** ({ zero: 0, first: 1, second: 2 }[order]);
  return { rateConstant, concentrationAt, concentration, halfLife, rate, productConcentration: c0 - concentration, convertedFraction: 1 - concentration / c0 };
}

export const reactionKineticsComponent: ImplementedComponent = {
  implemented: true, componentId: "chem.reaction-kinetics", name: "反应级数与温度效应", catalogDescription: "零一二级反应、半衰期和阿伦尼乌斯温度效应",
  configSchema: ReactionKineticsConfigSchema, patchSchema: ReactionKineticsPatchSchema,
  schemaDoc: `chem.reaction-kinetics config：order=zero|first|second 默认first；initialConcentration [0.1,2]mol/L 默认1；referenceRate 为298K速率常数[0.01,1] 默认0.1，单位随级数变化；temperatureK [273,373]K 默认298；activationEnergyKJ [10,100]kJ/mol 默认50；elapsedSeconds [0,60]s 默认5；showHalfLife 默认true。恒温恒容单一不可逆A→B教学模型，不含化学平衡。`,
  patchHints: "改变温度按Arrhenius公式改变k，不直接改反应级数；一级反应半衰期不随初始浓度变化；referenceRate单位分别M/s、s⁻¹、M⁻¹s⁻¹。",
};
