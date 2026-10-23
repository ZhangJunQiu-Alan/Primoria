import { z } from "zod";
import type { ImplementedComponent } from "./types";

const genotype = z.enum(["AA", "Aa", "aa"]);
const fields = { parent1: genotype, parent2: genotype, dominance: z.enum(["complete", "incomplete"]), view: z.enum(["punnett", "distribution"]), showGametes: z.boolean() };
export const MendelianGeneticsConfigSchema = z.object({ parent1: genotype.default("Aa"), parent2: genotype.default("Aa"), dominance: fields.dominance.default("complete"), view: fields.view.default("punnett"), showGametes: fields.showGametes.default(true) }).strict();
export const MendelianGeneticsPatchSchema = z.object(fields).partial().strict();
export type MendelianGeneticsConfig = z.infer<typeof MendelianGeneticsConfigSchema>;
export const DEFAULT_MENDELIAN_GENETICS_CONFIG = MendelianGeneticsConfigSchema.parse({});

export function computeMendelianCross(config: MendelianGeneticsConfig) {
  const gametes1 = config.parent1.split("");
  const gametes2 = config.parent2.split("");
  const counts = { AA: 0, Aa: 0, aa: 0 };
  const cells = gametes1.flatMap((a, row) => gametes2.map((b, col) => {
    const offspring = (a === b ? a + b : "Aa") as keyof typeof counts;
    counts[offspring]++;
    return { row, col, genotype: offspring, probability: 0.25 };
  }));
  const probabilities = { AA: counts.AA / 4, Aa: counts.Aa / 4, aa: counts.aa / 4 };
  return { gametes1, gametes2, cells, probabilities, dominantProbability: probabilities.AA + probabilities.Aa,
    phenotypes: config.dominance === "complete" ? [probabilities.AA + probabilities.Aa, probabilities.aa] : [probabilities.AA, probabilities.Aa, probabilities.aa] };
}

export const mendelianGeneticsComponent: ImplementedComponent = {
  implemented: true, componentId: "biology.mendelian-genetics", name: "孟德尔遗传与棋盘格", catalogDescription: "单基因杂交、配子分离、基因型与显隐性概率",
  configSchema: MendelianGeneticsConfigSchema, patchSchema: MendelianGeneticsPatchSchema,
  schemaDoc: `biology.mendelian-genetics config：parent1/parent2=AA|Aa|aa 默认Aa/Aa；dominance=complete|incomplete 默认complete；view=punnett|distribution 默认punnett；showGametes 默认true。单常染色体基因位点、等概率配子、随机受精的教学模型；不代表具体疾病/个体预测。`,
  patchHints: "测交为Aa×aa；纯合显性为AA；完全显性Aa×Aa的表现型3:1、基因型1:2:1。不完全显性Aa单独一种表现型。",
};
