import { z } from "zod";
import type { ImplementedComponent } from "./types";

const ComparisonFocusSchema = z.enum(["provenance", "claims", "corroboration", "limitations"]);
const SourceSchema = z.object({
  id: z.string().min(1).max(48),
  title: z.string().min(1).max(120),
  creator: z.string().min(1).max(100),
  context: z.string().min(1).max(240),
  claim: z.string().min(1).max(320),
  evidence: z.string().min(1).max(320),
  limitation: z.string().min(1).max(240),
});

const DEFAULT_SOURCES = [
  {
    id: "source-a",
    title: "Source A",
    creator: "First observer",
    context: "Produced close to the event",
    claim: "The change was deliberate.",
    evidence: "Direct testimony",
    limitation: "Narrow viewpoint",
  },
  {
    id: "source-b",
    title: "Source B",
    creator: "Later analyst",
    context: "Produced with broader records",
    claim: "The change emerged gradually.",
    evidence: "Multiple archived records",
    limitation: "Written long after the event",
  },
];

export const SourceComparisonConfigSchema = z.object({
  inquiryQuestion: z.string().min(1).max(240).default("How do these sources explain the same issue differently?"),
  sources: z.array(SourceSchema).min(2).max(4).default(DEFAULT_SOURCES),
  comparisonFocus: ComparisonFocusSchema.default("corroboration"),
});

export type SourceComparisonConfig = z.infer<typeof SourceComparisonConfigSchema>;

export const SourceComparisonPatchSchema = z
  .object({
    inquiryQuestion: z.string().min(1).max(240),
    sources: z.array(SourceSchema).min(2).max(4),
    comparisonFocus: ComparisonFocusSchema,
  })
  .partial();

export const DEFAULT_SOURCE_COMPARISON_CONFIG = SourceComparisonConfigSchema.parse({});

const FOCUS_LABELS = {
  provenance: "出处与语境",
  claims: "核心主张",
  corroboration: "证据与互证",
  limitations: "局限与偏差",
} as const;

export function buildSourceComparisonRows(config: SourceComparisonConfig) {
  return {
    focusLabel: FOCUS_LABELS[config.comparisonFocus],
    rows: config.sources.map((source) => {
      const content =
        config.comparisonFocus === "provenance"
          ? `${source.creator} · ${source.context}`
          : config.comparisonFocus === "claims"
            ? source.claim
            : config.comparisonFocus === "limitations"
              ? source.limitation
              : `${source.claim}｜证据: ${source.evidence}`;
      return { sourceId: source.id, title: source.title, content };
    }),
  };
}

export const sourceComparisonComponent: ImplementedComponent = {
  implemented: true,
  componentId: "humanities.source-comparison",
  name: "材料来源比较",
  catalogDescription: "按出处、主张、证据互证与局限比较两到四份材料",
  configSchema: SourceComparisonConfigSchema,
  patchSchema: SourceComparisonPatchSchema,
  schemaDoc: `humanities.source-comparison 的 config 字段(全部字段都有默认值,只写有把握的字段):
- inquiryQuestion: 比较材料时回答的核心问题,1~240 字符
- sources: 2~4 份材料;每项含 id、title、creator、context、claim、evidence、limitation,整体替换
- comparisonFocus: "provenance"|"claims"|"corroboration"|"limitations",默认 "corroboration"`,
  patchHints: `「重点看偏见」把 comparisonFocus 改为 "limitations";「再加入一种说法」追加一份完整 source,不能只给标题。`,
};
