import { z } from "zod";
import type { ImplementedComponent } from "./types";

const BeatSchema = z.object({ id: z.string().min(1).max(48), stage: z.string().min(1).max(80), event: z.string().min(1).max(260), tension: z.number().int().min(0).max(10), function: z.string().min(1).max(220) });
const DEFAULT_BEATS = [
  { id: "beat-1", stage: "Exposition", event: "The initial situation is established.", tension: 2, function: "Introduce the central conditions." },
  { id: "beat-2", stage: "Crisis", event: "The conflict reaches its decisive point.", tension: 9, function: "Force an irreversible choice." },
  { id: "beat-3", stage: "Resolution", event: "Consequences settle into a new state.", tension: 3, function: "Reveal what has changed." },
];
const formSchema = z.enum(["five-part", "three-act", "episodic"]);
export const NarrativeArcConfigSchema = z.object({ workTitle: z.string().min(1).max(160).default("A narrative"), narrativeForm: formSchema.default("five-part"), beats: z.array(BeatSchema).min(3).max(10).default(DEFAULT_BEATS) });
export type NarrativeArcConfig = z.infer<typeof NarrativeArcConfigSchema>;
export const NarrativeArcPatchSchema = z.object({ workTitle: z.string().min(1).max(160), narrativeForm: formSchema, beats: z.array(BeatSchema).min(3).max(10) }).partial();
export const DEFAULT_NARRATIVE_ARC_CONFIG = NarrativeArcConfigSchema.parse({});

export function analyzeNarrativeArc(config: NarrativeArcConfig) {
  let climaxIndex = 0;
  let tensionTotal = 0;
  config.beats.forEach((beat, index) => { tensionTotal += beat.tension; if (beat.tension > config.beats[climaxIndex].tension) climaxIndex = index; });
  return { climaxIndex, climax: config.beats[climaxIndex], averageTension: tensionTotal / config.beats.length, beats: config.beats.map((beat, index) => ({ ...beat, order: index + 1 })) };
}

export const narrativeArcComponent: ImplementedComponent = {
  implemented: true, componentId: "literature.narrative-arc", name: "叙事弧线",
  catalogDescription: "把情节节点、叙事功能与张力变化放在同一条弧线上",
  configSchema: NarrativeArcConfigSchema, patchSchema: NarrativeArcPatchSchema,
  schemaDoc: `literature.narrative-arc 的 config 字段(全部字段都有默认值,只写有把握的字段):
- workTitle: 作品名,1~160 字符,默认 "A narrative"
- narrativeForm: 叙事模型,"five-part"(五段式)|"three-act"(三幕式)|"episodic"(章节式),默认 "five-part"
- beats: 3~10 个情节节点;每项含 id、stage(阶段名)、event(事件)、tension(张力 0~10 整数)、function(叙事功能),整体替换`,
  patchHints: `「加入一个转折」整体更新 beats 并给转折较高 tension;「高潮更晚一点」调整各 beat 的 tension 分布;张力是解释工具,不是作品质量评分。`,
};
