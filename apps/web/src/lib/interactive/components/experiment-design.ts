import { z } from "zod";
import type { ImplementedComponent } from "./types";

const GroupSchema = z.object({ label: z.string().min(1).max(100), condition: z.string().min(1).max(220) });
const DEFAULT_GROUPS = [{ label: "Control group", condition: "Baseline condition" }, { label: "Treatment group", condition: "Changed independent variable" }];
export const ExperimentDesignConfigSchema = z.object({
  hypothesis: z.string().min(1).max(240).default("Changing the independent variable affects the measured outcome."),
  independentVariable: z.string().min(1).max(120).default("Study condition"),
  dependentVariable: z.string().min(1).max(120).default("Measured outcome"),
  controlVariables: z.array(z.string().min(1).max(100)).min(1).max(8).default(["Testing time", "Instructions"]),
  groups: z.array(GroupSchema).min(2).max(5).default(DEFAULT_GROUPS),
  sampleSize: z.number().int().min(4).max(1000).default(40),
});
export type ExperimentDesignConfig = z.infer<typeof ExperimentDesignConfigSchema>;
export const ExperimentDesignPatchSchema = z.object({ hypothesis: z.string().min(1).max(240), independentVariable: z.string().min(1).max(120), dependentVariable: z.string().min(1).max(120), controlVariables: z.array(z.string().min(1).max(100)).min(1).max(8), groups: z.array(GroupSchema).min(2).max(5), sampleSize: z.number().int().min(4).max(1000) }).partial();
export const DEFAULT_EXPERIMENT_DESIGN_CONFIG = ExperimentDesignConfigSchema.parse({});

export function summarizeExperimentDesign(config: ExperimentDesignConfig) {
  const baseSize = Math.floor(config.sampleSize / config.groups.length);
  const remainder = config.sampleSize % config.groups.length;
  return { allocations: config.groups.map((group, index) => ({ ...group, participants: baseSize + (index < remainder ? 1 : 0) })), controlCount: config.controlVariables.length, hasExplicitControlGroup: config.groups.some((group) => /control|baseline|对照/i.test(`${group.label} ${group.condition}`)) };
}

export const experimentDesignComponent: ImplementedComponent = {
  implemented: true, componentId: "psychology.experiment-design", name: "实验设计",
  catalogDescription: "用假设、变量、控制条件、分组和样本量构建受控研究",
  configSchema: ExperimentDesignConfigSchema, patchSchema: ExperimentDesignPatchSchema,
  schemaDoc: `psychology.experiment-design 的 config 字段(全部字段都有默认值,只写有把握的字段):
- hypothesis: 假设陈述,1~240 字符
- independentVariable: 自变量,1~120 字符
- dependentVariable: 因变量,1~120 字符
- controlVariables: 1~8 个需保持恒定的控制变量,整体替换
- groups: 2~5 个分组;每项含 label、condition,应包含明确对照组,整体替换
- sampleSize: 总样本量,整数,[4,1000],默认 40`,
  patchHints: `「控制住某因素」把它加入 controlVariables;「样本翻倍/扩大样本」只增大 sampleSize;「加一个剂量组」追加完整 group 并保留对照组。`,
};
