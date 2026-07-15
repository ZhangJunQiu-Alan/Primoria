"use client";

import { useState } from "react";
import { msg } from "@/lib/i18n/client";
import { useInteractiveT } from "./i18n";
import { segmentAnnotatedPassage, type CloseReadingConfig } from "@/lib/interactive/components/close-reading";
import { WIDGET_COLORS } from "./palette";

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
    <section style={{ overflow: "hidden", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 10, background: WIDGET_COLORS.surface }} aria-label={t.closeReadingAria}>
      <header style={{ padding: "12px 16px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.closeReadingTitle}</div>
        <div style={{ marginTop: 2, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>{t.closeReadingSubtitle}</div>
      </header>

      <div role="group" aria-label={t.closeReadingFocus} style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "12px 16px 0" }}>
        {focusOptions.map(([value, label]) => {
          const active = config.focus === value;
          const count = config.annotations.filter((annotation) => annotation.focus === value).length;
          return (
            <button key={value} type="button" aria-pressed={active} onClick={() => onChange({ ...config, focus: value })} style={{
              minHeight: 36, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
              border: `1px solid ${active ? WIDGET_COLORS.series3 : WIDGET_COLORS.line}`,
              background: active ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface,
              color: active ? WIDGET_COLORS.series3 : WIDGET_COLORS.muted, fontSize: 12,
            }}>{label} · {count}</button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(220px, .65fr)", gap: 14, padding: 14 }}>
        <blockquote style={{ margin: 0, padding: "20px 22px", borderLeft: `3px solid ${WIDGET_COLORS.series3}`, borderRadius: 8, background: WIDGET_COLORS.surfaceSoft, color: WIDGET_COLORS.ink, fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.85 }}>
          {result.segments.map((segment, index) => segment.annotationIndex === null ? (
            <span key={`${index}-${segment.text}`}>{segment.text}</span>
          ) : (
            <button
              key={`${index}-${segment.text}`}
              type="button"
              onClick={() => setSelectedIndex(segment.annotationIndex)}
              aria-pressed={activeIndex === segment.annotationIndex}
              style={{
                display: "inline", margin: 0, padding: "1px 3px", border: "none", borderBottom: `2px solid ${WIDGET_COLORS.series3}`,
                background: activeIndex === segment.annotationIndex ? WIDGET_COLORS.accentSoft : "transparent",
                color: "inherit", font: "inherit", cursor: "pointer",
              }}
            >{segment.text}</button>
          ))}
        </blockquote>

        <aside style={{ minHeight: 170, padding: 14, border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 8 }}>
          {activeAnnotation ? (
            <>
              <div style={{ color: WIDGET_COLORS.series3, fontSize: 11.5, fontWeight: 600 }}>{activeAnnotation.device}</div>
              <div style={{ marginTop: 8, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>{t.observation}</div>
              <p style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.5 }}>{activeAnnotation.observation}</p>
              <div style={{ marginTop: 11, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>{t.effect}</div>
              <p style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.5 }}>{activeAnnotation.effect}</p>
            </>
          ) : <div style={{ color: WIDGET_COLORS.muted, fontSize: 12 }}>{t.noAnnotations}</div>}
        </aside>
      </div>
      {result.missingAnnotationIndexes.length > 0 ? (
        <div style={{ padding: "0 16px 14px", color: WIDGET_COLORS.warn, fontSize: 11.5 }}>
          {msg(t.ignoredAnnotations, { count: result.missingAnnotationIndexes.length })}
        </div>
      ) : null}
    </section>
  );
}
