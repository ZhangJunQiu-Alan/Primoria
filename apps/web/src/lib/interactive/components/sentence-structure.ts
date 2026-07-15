import { z } from "zod";
import type { ImplementedComponent } from "./types";

const PhraseSchema = z.object({ id: z.string().min(1).max(48), text: z.string().min(1).max(120), role: z.string().min(1).max(80), dependsOnId: z.string().min(1).max(48).nullable() });
const DEFAULT_PHRASES = [
  { id: "subject", text: "The careful reader", role: "subject", dependsOnId: "predicate" },
  { id: "predicate", text: "notices", role: "predicate", dependsOnId: null },
  { id: "object", text: "the contrast", role: "object", dependsOnId: "predicate" },
];
const languageSchema = z.enum(["en", "zh", "es", "fr", "de", "ja"]);
const targetSchema = z.enum(["clause", "phrase", "word-order", "dependency"]);
export const SentenceStructureConfigSchema = z.object({ sentence: z.string().min(1).max(240).default("The careful reader notices the contrast."), languageCode: languageSchema.default("en"), phrases: z.array(PhraseSchema).min(2).max(12).default(DEFAULT_PHRASES), targetStructure: targetSchema.default("dependency") });
export type SentenceStructureConfig = z.infer<typeof SentenceStructureConfigSchema>;
export const SentenceStructurePatchSchema = z.object({ sentence: z.string().min(1).max(240), languageCode: languageSchema, phrases: z.array(PhraseSchema).min(2).max(12), targetStructure: targetSchema }).partial();
export const DEFAULT_SENTENCE_STRUCTURE_CONFIG = SentenceStructureConfigSchema.parse({});

export function analyzeSentenceStructure(config: SentenceStructureConfig) {
  const ids = new Set(config.phrases.map((phrase) => phrase.id));
  const validPhrases = config.phrases.filter((phrase) => phrase.dependsOnId === null || (phrase.dependsOnId !== phrase.id && ids.has(phrase.dependsOnId)));
  return { validPhrases, invalidPhrases: config.phrases.filter((phrase) => !validPhrases.includes(phrase)), roots: validPhrases.filter((phrase) => phrase.dependsOnId === null) };
}

export const sentenceStructureComponent: ImplementedComponent = {
  implemented: true, componentId: "language.sentence-structure", name: "句子结构",
  catalogDescription: "比较语序、短语角色与依存关系,支持六种语言标记",
  configSchema: SentenceStructureConfigSchema, patchSchema: SentenceStructurePatchSchema,
  schemaDoc: `language.sentence-structure 的 config 字段(全部字段都有默认值,只写有把握的字段):
- sentence: 原句,1~240 字符,默认 "The careful reader notices the contrast."
- languageCode: 句子语言,"en"|"zh"|"es"|"fr"|"de"|"ja",默认 "en"
- phrases: 2~12 个短语;每项含 id、text(原文片段)、role(句法角色)、dependsOnId(依存的短语 id,句法根为 null),整体替换
- targetStructure: 观察层级,"clause"(分句)|"phrase"(短语)|"word-order"(语序)|"dependency"(依存),默认 "dependency"`,
  patchHints: `「换一个句子」同时替换 sentence 与 phrases;「看语序」只改 targetStructure 为 "word-order";dependsOnId 必须引用已有 phrase id 或为 null。`,
};
