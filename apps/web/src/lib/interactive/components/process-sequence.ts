import { z } from "zod";
import type { ImplementedComponent } from "./types";

const StepSchema = z.object({ id: z.string().min(1).max(48), label: z.string().min(1).max(100), input: z.string().min(1).max(200), change: z.string().min(1).max(240), output: z.string().min(1).max(200) });
const FeedbackSchema = z.object({ fromStepId: z.string().min(1).max(48), toStepId: z.string().min(1).max(48), reason: z.string().min(1).max(240) });
const DEFAULT_STEPS = [
  { id: "step-1", label: "Receive input", input: "Starting material", change: "Interpret or transform the input", output: "Intermediate result" },
  { id: "step-2", label: "Produce outcome", input: "Intermediate result", change: "Apply the final transformation", output: "Final outcome" },
];
export const ProcessSequenceConfigSchema = z.object({
  processName: z.string().min(1).max(120).default("A multi-step process"),
  steps: z.array(StepSchema).min(2).max(10).default(DEFAULT_STEPS),
  feedbackLinks: z.array(FeedbackSchema).min(0).max(6).default([]),
});
export type ProcessSequenceConfig = z.infer<typeof ProcessSequenceConfigSchema>;
export const ProcessSequencePatchSchema = z.object({ processName: z.string().min(1).max(120), steps: z.array(StepSchema).min(2).max(10), feedbackLinks: z.array(FeedbackSchema).min(0).max(6) }).partial();
export const DEFAULT_PROCESS_SEQUENCE_CONFIG = ProcessSequenceConfigSchema.parse({});

export function deriveProcessSequence(config: ProcessSequenceConfig) {
  const ids = new Set(config.steps.map((step) => step.id));
  const validFeedbackLinks = config.feedbackLinks.filter((link) => ids.has(link.fromStepId) && ids.has(link.toStepId) && link.fromStepId !== link.toStepId);
  return { steps: config.steps.map((step, index) => ({ ...step, order: index + 1 })), validFeedbackLinks, invalidFeedbackCount: config.feedbackLinks.length - validFeedbackLinks.length };
}

export const processSequenceComponent: ImplementedComponent = {
  implemented: true, componentId: "general.process-sequence", name: "过程序列",
  catalogDescription: "展示跨学科过程中的输入、变化、输出与反馈回路",
  configSchema: ProcessSequenceConfigSchema, patchSchema: ProcessSequencePatchSchema,
  schemaDoc: `general.process-sequence 的 config 字段(全部字段都有默认值,只写有把握的字段):
- processName: 过程名称,1~120 字符,默认 "A multi-step process"
- steps: 2~10 个按先后排列的步骤;每项含 id、label、input(输入)、change(变化)、output(输出),整体替换
- feedbackLinks: 0~6 条反馈回路;每项含 fromStepId、toStepId、reason,id 必须引用已有步骤,整体替换,默认为空`,
  patchHints: `「加一步」整体更新 steps 并保持顺序;「这里有反馈/循环」只有过程确实回到之前步骤时才增加 feedbackLinks;「简化一点」减少 steps 数量。`,
};
