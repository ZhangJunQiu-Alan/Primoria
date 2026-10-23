"use client";

import { useState } from "react";
import { msg } from "@/lib/i18n/client";
import { useInteractiveT } from "./i18n";
import { segmentAnnotatedPassage, type CloseReadingConfig } from "@/lib/interactive/components/close-reading";
import { WIDGET_COLORS } from "./palette";
import { WidgetShell } from "./primitives/widget-shell";

export function CloseReadingWidget({ config, onChange }: {
  config: CloseReadingConfig;
  onChange: (next: CloseReadingConfig) => void;
}) {
  const result = segmentAnnotatedPassage(config);
  const t = useInteractiveT().widgets;
  const focusOptions = [["diction", t.diction], ["imagery", t.imagery], ["syntax", t.syntax], ["structure", t.structure], ["voice", t.voice]] as const;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const fallbackIndex = config.annotations.findIndex((annotation) => annotation.focus === config.focus);
  const activeIndex = selectedIndex !== null && config.annotations[selectedIndex]?.focus === config.focus ? selectedIndex : fallbackIndex;
  const activeAnnotation = activeIndex >= 0 ? config.annotations[activeIndex] : null;

  return (
    <WidgetShell componentId="literature.close-reading" title={t.closeReadingTitle}>
      <p style={{ margin: 0, padding: "12px 16px 0", color: WIDGET_COLORS.muted, fontSize: 12, lineHeight: 1.7 }}>{t.closeReadingSubtitle}</p>
      <div role="group" aria-label={t.closeReadingFocus} style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "12px 16px" }}>
        {focusOptions.map(([value, label]) => {
          const active = config.focus === value;
          const count = config.annotations.filter((annotation) => annotation.focus === value).length;
          return <button key={value} type="button" aria-pressed={active} onClick={() => onChange({ ...config, focus: value })} style={{
            minHeight: 36, padding: "6px 12px", borderRadius: 7, cursor: "pointer",
            border: `1px solid ${active ? WIDGET_COLORS.series3 : WIDGET_COLORS.line}`,
            background: active ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface,
            color: active ? WIDGET_COLORS.series3 : WIDGET_COLORS.muted, fontSize: 12,
          }}>{label} · {count}</button>;
        })}
      </div>
      <blockquote style={{ margin: "0 16px 16px", padding: "20px 22px", borderLeft: `3px solid ${WIDGET_COLORS.series3}`, borderRadius: 8, background: WIDGET_COLORS.surfaceSoft, color: WIDGET_COLORS.ink, fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: 19, lineHeight: 2, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {result.segments.map((segment, index) => segment.annotationIndex === null ? <span key={index}>{segment.text}</span> : <button
          key={index} type="button" onClick={() => setSelectedIndex(segment.annotationIndex)} aria-pressed={activeIndex === segment.annotationIndex}
          style={{ display: "inline", margin: 0, padding: "1px 3px", border: "none", borderBottom: `2px solid ${WIDGET_COLORS.series3}`, background: activeIndex === segment.annotationIndex ? WIDGET_COLORS.accentSoft : "transparent", color: "inherit", font: "inherit", cursor: "pointer", overflowWrap: "anywhere" }}
        >{segment.text}</button>)}
      </blockquote>
      <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: 12, listStyle: "none", margin: 0, padding: "0 16px 16px" }}>
        {config.annotations.map((annotation, index) => annotation.focus === config.focus ? <li key={index} data-annotation-index={index} style={{ minWidth: 0, padding: 16, border: `1px solid ${activeIndex === index ? WIDGET_COLORS.series3 : WIDGET_COLORS.line}`, borderRadius: 8, background: activeIndex === index ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface, overflowWrap: "anywhere" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", color: WIDGET_COLORS.series3 }}><span aria-hidden="true" style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{String(index + 1).padStart(2, "0")}</span><strong style={{ fontSize: 13 }}>{annotation.device}</strong></div>
          <q style={{ display: "block", marginTop: 10, color: WIDGET_COLORS.ink, fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: 17, lineHeight: 1.7 }}>{annotation.quote}</q>
          <div style={{ marginTop: 13, paddingLeft: 12, borderLeft: `2px solid ${WIDGET_COLORS.line}` }}>
            <div style={{ color: WIDGET_COLORS.muted, fontSize: 11 }}>{t.observation}</div><p style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.75 }}>{annotation.observation}</p>
            <div aria-hidden="true" style={{ margin: "5px 0", color: WIDGET_COLORS.series3 }}>↓</div>
            <div style={{ color: WIDGET_COLORS.muted, fontSize: 11 }}>{t.effect}</div><p style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.75 }}>{annotation.effect}</p>
          </div>
        </li> : null)}
      </ol>
      {!activeAnnotation ? <p style={{ padding: "0 16px 16px", margin: 0, color: WIDGET_COLORS.muted, fontSize: 12 }}>{t.noAnnotations}</p> : null}
      {result.missingAnnotationIndexes.length > 0 ? <div role="note" style={{ padding: "0 16px 16px", color: WIDGET_COLORS.warn, fontSize: 12 }}>{msg(t.ignoredAnnotations, { count: result.missingAnnotationIndexes.length })}</div> : null}
    </WidgetShell>
  );
}
