import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { trials: z.number().int().min(1).max(40), successProbability: z.number().min(0).max(1), threshold: z.number().int().min(0).max(40), event: z.enum(["exact", "at-most", "at-least"]), view: z.enum(["pmf", "cdf"]) };
export const BinomialDistributionConfigSchema = z.object({ trials: fields.trials.default(10), successProbability: fields.successProbability.default(0.5), threshold: fields.threshold.default(5), event: fields.event.default("exact"), view: fields.view.default("pmf") }).strict();
export const BinomialDistributionPatchSchema = z.object(fields).partial().strict();
export type BinomialDistributionConfig = z.infer<typeof BinomialDistributionConfigSchema>;
export const DEFAULT_BINOMIAL_DISTRIBUTION_CONFIG = BinomialDistributionConfigSchema.parse({});

export function computeBinomial(config: BinomialDistributionConfig) {
  const { trials: n, successProbability: p, threshold: threshold, event } = config;
  let coefficient = 1, cumulative = 0;
  const outcomes = Array.from({ length: n + 1 }, (_, k) => {
    if (k > 0) coefficient *= (n - k + 1) / k;
    const probability = coefficient * p ** k * (1 - p) ** (n - k);
    cumulative += probability;
    return { k, probability, cumulative: Math.min(1, cumulative), selected: event === "exact" ? k === threshold : event === "at-most" ? k <= threshold : k >= threshold };
  });
  return { outcomes, eventProbability: Math.min(1, outcomes.filter((r) => r.selected).reduce((sum, r) => sum + r.probability, 0)), mean: n * p, variance: n * p * (1 - p), standardDeviation: Math.sqrt(n * p * (1 - p)) };
}

export const binomialDistributionComponent: ImplementedComponent = {
  implemented: true, componentId: "math.binomial-distribution", name: "二项分布与独立试验", catalogDescription: "成功次数概率、累计概率、期望与方差",
  configSchema: BinomialDistributionConfigSchema, patchSchema: BinomialDistributionPatchSchema,
  schemaDoc: "math.binomial-distribution config：trials [1,40]整数 默认10；successProbability [0,1] 默认0.5；threshold [0,40]整数 默认5；event=exact|at-most|at-least 默认exact；view=pmf|cdf 默认pmf。n次独立同分布伯努利试验；threshold超过n允许显示不可能/必然事件。",
  patchHints: "恰好/至多/至少分别对应exact/at-most/at-least；每次成功概率固定且独立。不放回抽样不能直接套此模型。",
};
