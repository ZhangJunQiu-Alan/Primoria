import { z } from "zod";
import type { ImplementedComponent } from "./types";

const OptionSchema = z.object({ id: z.string().min(1).max(48), label: z.string().min(1).max(100), summary: z.string().min(1).max(260) });
const CriterionSchema = z.object({ id: z.string().min(1).max(48), label: z.string().min(1).max(100), importance: z.number().int().min(1).max(5) });
const StakeholderSchema = z.object({ id: z.string().min(1).max(48), label: z.string().min(1).max(100), priority: z.string().min(1).max(220) });
const DEFAULT_OPTIONS = [{ id: "option-a", label: "Targeted intervention", summary: "Direct resources to the groups with greatest need." }, { id: "option-b", label: "Universal intervention", summary: "Provide the same baseline support to everyone." }];
const DEFAULT_CRITERIA = [{ id: "access", label: "Access", importance: 5 }, { id: "cost", label: "Public cost", importance: 3 }, { id: "durability", label: "Long-term durability", importance: 4 }];
const DEFAULT_STAKEHOLDERS = [{ id: "residents", label: "Residents", priority: "Reliable access" }, { id: "government", label: "Government", priority: "Sustainable public spending" }];
export const PolicyTradeoffConfigSchema = z.object({
  policyQuestion: z.string().min(1).max(240).default("Which policy best balances access, cost, and long-term effects?"),
  options: z.array(OptionSchema).min(2).max(5).default(DEFAULT_OPTIONS),
  criteria: z.array(CriterionSchema).min(2).max(6).default(DEFAULT_CRITERIA),
  stakeholders: z.array(StakeholderSchema).min(2).max(6).default(DEFAULT_STAKEHOLDERS),
});
export type PolicyTradeoffConfig = z.infer<typeof PolicyTradeoffConfigSchema>;
export const PolicyTradeoffPatchSchema = z.object({ policyQuestion: z.string().min(1).max(240), options: z.array(OptionSchema).min(2).max(5), criteria: z.array(CriterionSchema).min(2).max(6), stakeholders: z.array(StakeholderSchema).min(2).max(6) }).partial();
export const DEFAULT_POLICY_TRADEOFF_CONFIG = PolicyTradeoffConfigSchema.parse({});

export function derivePolicyTradeoff(config: PolicyTradeoffConfig) {
  const totalImportance = config.criteria.reduce((sum, criterion) => sum + criterion.importance, 0);
  return { weightedCriteria: config.criteria.map((criterion) => ({ ...criterion, share: criterion.importance / totalImportance })), totalImportance, optionCount: config.options.length, stakeholderCount: config.stakeholders.length };
}

export const policyTradeoffComponent: ImplementedComponent = {
  implemented: true, componentId: "social.policy-tradeoff", name: "政策权衡",
  catalogDescription: "并列政策选项、判断标准与利益相关者,不自动宣告赢家",
  configSchema: PolicyTradeoffConfigSchema, patchSchema: PolicyTradeoffPatchSchema,
  schemaDoc: `social.policy-tradeoff 的 config 字段(全部字段都有默认值,只写有把握的字段):
- policyQuestion: 政策问题,1~240 字符
- options: 2~5 个政策选项;每项含 id、label、summary,整体替换
- criteria: 2~6 条判断标准;每项含 id、label、importance(权重 1~5 整数),整体替换
- stakeholders: 2~6 个利益相关者;每项含 id、label、priority(其优先关切),整体替换`,
  patchHints: `「更看重成本」提高对应 criterion 的 importance,不要删除其他标准;「加一个选项」追加完整 option;组件不会据权重自动判定赢家。`,
};
