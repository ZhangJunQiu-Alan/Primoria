"use client";

import { analyzeSentenceStructure, type SentenceStructureConfig } from "@/lib/interactive/components/sentence-structure";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

export function SentenceStructureWidget({ config, onChange }: { config: SentenceStructureConfig; onChange: (next: SentenceStructureConfig) => void }) {
  const analysis = analyzeSentenceStructure(config);
  return (
    <WidgetShell componentId="language.sentence-structure" title="句子结构 · 语序与依存">
      <blockquote style={{ margin: 0, padding: "18px 20px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, color: WIDGET_COLORS.ink, fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: 20, lineHeight: 1.5 }}>{config.sentence}</blockquote>
      <div style={{ display: "flex", alignItems: "stretch", overflowX: "auto", gap: 8, padding: 16 }}>
        {analysis.validPhrases.map((phrase, index) => <div key={phrase.id} style={{ minWidth: 120, flex: 1, border: `1px solid ${phrase.dependsOnId === null ? WIDGET_COLORS.accent : WIDGET_COLORS.line}`, borderRadius: 8, background: phrase.dependsOnId === null ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface, padding: 10 }}><small style={{ color: WIDGET_COLORS.series3, fontWeight: 650 }}>{index + 1}. {phrase.role}</small><div style={{ marginTop: 7, color: WIDGET_COLORS.ink, fontWeight: 600 }}>{phrase.text}</div><div style={{ marginTop: 8, color: WIDGET_COLORS.muted, fontSize: 10.5 }}>{phrase.dependsOnId ? `依存于 → ${phrase.dependsOnId}` : "句法根"}</div></div>)}
      </div>
      <div style={{ display: "grid", gap: 10, padding: "0 14px 14px" }}>
        <SegmentedControl label="观察层级" value={config.targetStructure} options={[["clause", "分句"], ["phrase", "短语"], ["word-order", "语序"], ["dependency", "依存"]]} onChange={(targetStructure) => onChange({ ...config, targetStructure })} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}><Readout label="语言" value={config.languageCode} /><Readout label="句法根" value={analysis.roots.length} />{analysis.invalidPhrases.length ? <Readout label="失效依存" value={analysis.invalidPhrases.length} tone="warn" /> : null}</div>
      </div>
    </WidgetShell>
  );
}
