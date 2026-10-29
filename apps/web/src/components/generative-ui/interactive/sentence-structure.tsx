"use client";

import { msg } from "@/lib/i18n/client";
import { useInteractiveT } from "./i18n";
import { analyzeSentenceStructure, type SentenceStructureConfig } from "@/lib/interactive/components/sentence-structure";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";
import { useSceneLocale } from "./primitives/scene-frame";

export function SentenceStructureWidget({ config, onChange }: { config: SentenceStructureConfig; onChange: (next: SentenceStructureConfig) => void }) {
  const t = useInteractiveT().widgets;
  const localize = useSceneLocale();
  const analysis = analyzeSentenceStructure(config);
  const phrases = [...analysis.validPhrases].sort((a, b) => {
    const position = (text: string) => { const index = config.sentence.indexOf(text); return index < 0 ? Infinity : index; };
    return position(a.text) - position(b.text);
  });
  const byId = new Map(phrases.map((phrase) => [phrase.id, phrase]));
  const groups = new Map<string | null, typeof phrases>();
  for (const phrase of phrases) {
    let current = phrase;
    const seen = new Set<string>();
    while (current.dependsOnId && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = byId.get(current.dependsOnId);
      if (!parent) break;
      current = parent;
    }
    const key = current.dependsOnId === null ? current.id : null;
    groups.set(key, [...(groups.get(key) ?? []), phrase]);
  }
  return (
    <WidgetShell componentId="language.sentence-structure" title={t.sentenceTitle}>
      <blockquote style={{ margin: 0, padding: "18px 20px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, color: WIDGET_COLORS.ink, fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: 20, lineHeight: 1.5 }}>{config.sentence}</blockquote>
      <div data-sentence-view={config.targetStructure} style={{ padding: 16, color: WIDGET_COLORS.ink }}>
        {config.targetStructure === "clause" ? <>
          <p style={{ margin: "0 0 10px", color: WIDGET_COLORS.muted, fontSize: 12 }}>{localize("按已标注的依存根分组；这不是对原句分句边界的自动判定。", "Grouped by the supplied dependency roots; these groups do not automatically establish clause boundaries.")}</p>
          {[...groups].map(([rootId, members], index) => <div key={rootId ?? "unresolved"} style={{ borderLeft: `3px solid ${WIDGET_COLORS.accent}`, padding: "8px 12px", marginBottom: 8, background: WIDGET_COLORS.surfaceSoft }}><b>{rootId ? `${t.clause} ${index + 1} · ${t.syntaxRoot}: ${byId.get(rootId)!.text}` : localize("未能归入依存根的片段", "Fragments without a resolved root")}</b><div style={{ marginTop: 8, lineHeight: 1.7 }}>{members.map((phrase) => phrase.text).join(" · ")}</div></div>)}
        </> : config.targetStructure === "word-order" ? <>
          <p style={{ margin: "0 0 10px", color: WIDGET_COLORS.muted, fontSize: 12 }}>{localize("按原句中片段首次出现的位置排列；未匹配片段保留标注顺序。", "Ordered by each fragment’s first position in the sentence; unmatched fragments retain annotation order.")}</p>
          <ol style={{ display: "flex", flexWrap: "wrap", gap: 12, paddingLeft: 24, margin: 0 }}>{phrases.map((phrase) => <li key={phrase.id} style={{ padding: "8px 12px", borderRadius: 8, background: WIDGET_COLORS.surfaceSoft }}><b>{phrase.text}</b><div style={{ fontSize: 12, color: WIDGET_COLORS.series3, marginTop: 6 }}>{phrase.role}</div></li>)}</ol>
        </> : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {phrases.map((phrase, index) => <div key={phrase.id} style={{ minWidth: 120, flex: "1 1 120px", border: `1px solid ${phrase.dependsOnId === null ? WIDGET_COLORS.accent : WIDGET_COLORS.line}`, borderRadius: 8, background: phrase.dependsOnId === null ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface, padding: 10, overflowWrap: "anywhere" }}><small style={{ color: WIDGET_COLORS.series3, fontWeight: 650 }}>{index + 1}. {phrase.role}</small><div style={{ marginTop: 7, fontWeight: 600 }}>{phrase.text}</div>{config.targetStructure === "dependency" ? <div style={{ marginTop: 8, color: WIDGET_COLORS.muted, fontSize: 10.5 }}>{phrase.dependsOnId ? msg(t.dependsOn, { id: byId.get(phrase.dependsOnId)?.text ?? phrase.dependsOnId }) : t.syntaxRoot}</div> : null}</div>)}
        </div>}
      </div>
      <div style={{ display: "grid", gap: 10, padding: "0 14px 14px" }}>
        <SegmentedControl label={t.observationLevel} value={config.targetStructure} options={[["clause", t.clause], ["phrase", t.phrase], ["word-order", t.wordOrder], ["dependency", t.dependency]]} onChange={(targetStructure) => onChange({ ...config, targetStructure })} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}><Readout label={t.language} value={config.languageCode} /><Readout label={t.syntaxRoot} value={analysis.roots.length} />{analysis.invalidPhrases.length ? <Readout label={t.invalidDependency} value={analysis.invalidPhrases.length} tone="warn" /> : null}</div>
      </div>
    </WidgetShell>
  );
}
