import { z } from "zod";
import type { ImplementedComponent } from "./types";

const signatureSchema = z.enum(["2/4", "3/4", "4/4", "6/8"]);
const subdivisionSchema = z.enum(["quarter", "eighth", "sixteenth"]);
const stepSchema = z.enum(["accent", "hit", "rest"]);
export const RhythmPatternConfigSchema = z.object({ timeSignature: signatureSchema.default("4/4"), tempoBpm: z.number().int().min(40).max(200).default(96), subdivision: subdivisionSchema.default("eighth"), steps: z.array(stepSchema).min(4).max(32).default(["accent", "rest", "hit", "rest", "hit", "rest", "hit", "rest"]) });
export type RhythmPatternConfig = z.infer<typeof RhythmPatternConfigSchema>;
export const RhythmPatternPatchSchema = z.object({ timeSignature: signatureSchema, tempoBpm: z.number().int().min(40).max(200), subdivision: subdivisionSchema, steps: z.array(stepSchema).min(4).max(32) }).partial();
export const DEFAULT_RHYTHM_PATTERN_CONFIG = RhythmPatternConfigSchema.parse({});

export function analyzeRhythmPattern(config: RhythmPatternConfig) {
  const beatUnitSeconds = 60 / config.tempoBpm;
  const subdivisionFactor = config.subdivision === "quarter" ? 1 : config.subdivision === "eighth" ? 2 : 4;
  const [beatsPerMeasure, denominator] = config.timeSignature.split("/").map(Number);
  const stepsPerMeasure = beatsPerMeasure * subdivisionFactor * (4 / denominator);
  const stepDurationSeconds = beatUnitSeconds / subdivisionFactor;
  return { stepDurationSeconds, stepsPerMeasure, totalDurationSeconds: config.steps.length * stepDurationSeconds, soundedSteps: config.steps.filter((step) => step !== "rest").length, accentCount: config.steps.filter((step) => step === "accent").length };
}

export const rhythmPatternComponent: ImplementedComponent = {
  implemented: true, componentId: "music.rhythm-pattern", name: "节奏型探索",
  catalogDescription: "用拍号、细分、重音与休止构建并播放有限节奏型",
  configSchema: RhythmPatternConfigSchema, patchSchema: RhythmPatternPatchSchema,
  schemaDoc: `music.rhythm-pattern 的 config 字段(全部字段都有默认值,只写有把握的字段):
- timeSignature: 拍号,"2/4"|"3/4"|"4/4"|"6/8",默认 "4/4"
- tempoBpm: 速度,BPM 整数,[40,200],默认 96
- subdivision: 细分单位,"quarter"(四分)|"eighth"(八分)|"sixteenth"(十六分),默认 "eighth"
- steps: 4~32 个节奏步;每步 "accent"(重音)|"hit"(击拍)|"rest"(休止),整体替换,默认 8 步`,
  patchHints: `「快一点/慢一点」tempoBpm 约 ±20%;「加入切分」只调整 steps 里 accent/hit/rest 的分布;「改成三拍子」timeSignature="3/4" 且 steps 长度取每小节步数的整数倍。`,
};
