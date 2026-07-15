import { z } from "zod";
import type { ImplementedComponent } from "./types";

const ReadingFocusSchema = z.enum(["diction", "imagery", "syntax", "structure", "voice"]);
const AnnotationSchema = z.object({
  quote: z.string().min(1).max(180),
  focus: ReadingFocusSchema,
  device: z.string().min(1).max(80),
  observation: z.string().min(1).max(280),
  effect: z.string().min(1).max(280),
});

const DEFAULT_ANNOTATIONS = [
  {
    quote: "more than one interpretation",
    focus: "diction" as const,
    device: "qualification",
    observation: "The wording resists a single fixed reading.",
    effect: "It invites the reader to compare plausible meanings.",
  },
];

export const CloseReadingConfigSchema = z.object({
  passage: z.string().min(1).max(1200).default("A short passage whose language supports more than one interpretation."),
  focus: ReadingFocusSchema.default("diction"),
  annotations: z.array(AnnotationSchema).min(1).max(8).default(DEFAULT_ANNOTATIONS),
});

export type CloseReadingConfig = z.infer<typeof CloseReadingConfigSchema>;

export const CloseReadingPatchSchema = z
  .object({
    passage: z.string().min(1).max(1200),
    focus: ReadingFocusSchema,
    annotations: z.array(AnnotationSchema).min(1).max(8),
  })
  .partial();

export const DEFAULT_CLOSE_READING_CONFIG = CloseReadingConfigSchema.parse({});

export type PassageSegment = { text: string; annotationIndex: number | null };

export function segmentAnnotatedPassage(config: CloseReadingConfig) {
  const matches = config.annotations
    .map((annotation, annotationIndex) => ({
      annotation,
      annotationIndex,
      start: annotation.focus === config.focus ? config.passage.indexOf(annotation.quote) : -1,
    }))
    .filter((match) => match.start >= 0)
    .sort((a, b) => a.start - b.start || b.annotation.quote.length - a.annotation.quote.length);

  const segments: PassageSegment[] = [];
  const usedAnnotations = new Set<number>();
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) segments.push({ text: config.passage.slice(cursor, match.start), annotationIndex: null });
    const end = match.start + match.annotation.quote.length;
    segments.push({ text: config.passage.slice(match.start, end), annotationIndex: match.annotationIndex });
    usedAnnotations.add(match.annotationIndex);
    cursor = end;
  }
  if (cursor < config.passage.length) segments.push({ text: config.passage.slice(cursor), annotationIndex: null });

  return {
    segments,
    visibleAnnotations: config.annotations.filter((annotation) => annotation.focus === config.focus),
    missingAnnotationIndexes: config.annotations
      .map((annotation, index) => ({ annotation, index }))
      .filter(({ annotation, index }) => annotation.focus === config.focus && !usedAnnotations.has(index))
      .map(({ index }) => index),
  };
}

export const closeReadingComponent: ImplementedComponent = {
  implemented: true,
  componentId: "literature.close-reading",
  name: "文本细读",
  catalogDescription: "引用短文本证据并解释措辞、意象、句法、结构或声音效果",
  configSchema: CloseReadingConfigSchema,
  patchSchema: CloseReadingPatchSchema,
  schemaDoc: `literature.close-reading 的 config 字段(全部字段都有默认值,只写有把握的字段):
- passage: 待细读短文本,1~1200 字符
- focus: "diction"|"imagery"|"syntax"|"structure"|"voice",默认 "diction"
- annotations: 1~8 条标注;每项含 passage 中的准确短引 quote、focus、device、observation、effect,整体替换`,
  patchHints: `「重点看句法」把 focus 改为 "syntax" 并只在有证据时补充 syntax 标注;「再补一处文本证据」必须使用 passage 中实际存在的短引文。`,
};
