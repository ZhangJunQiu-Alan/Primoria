"use client";

import { useState } from "react";
import { msg } from "@/lib/i18n/client";
import { useInteractiveT } from "./i18n";
import { buildSourceComparisonRows, type SourceComparisonConfig } from "@/lib/interactive/components/source-comparison";
import { WIDGET_COLORS } from "./palette";

export function SourceComparisonWidget({ config, onChange }: {
  config: SourceComparisonConfig;
  onChange: (next: SourceComparisonConfig) => void;
}) {
  const t = useInteractiveT();
  const [selectedSourceId, setSelectedSourceId] = useState(config.sources[0]?.id ?? "");
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const focusOptions = [
    ["provenance", t.sourceComparison.provenance],
    ["claims", t.sourceComparison.claims],
    ["corroboration", t.sourceComparison.corroboration],
    ["limitations", t.sourceComparison.limitations],
  ] as const;
  const comparison = buildSourceComparisonRows(config, {
    focusLabels: {
      provenance: t.sourceComparison.provenanceLabel,
      claims: t.sourceComparison.claimsLabel,
      corroboration: t.sourceComparison.corroborationLabel,
      limitations: t.sourceComparison.limitationsLabel,
    },
    evidencePrefix: (evidence) => msg(t.sourceComparison.evidencePrefix, { evidence }),
  });
  const selectedSource = config.sources.find((source) => source.id === selectedSourceId) ?? config.sources[0];
  return (
    <section style={{ overflow: "hidden", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 10, background: WIDGET_COLORS.surface }} aria-label={t.sourceComparison.aria}>
      <header style={{ padding: "12px 16px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.sourceComparison.title}</div>
        <p style={{ margin: "4px 0 0", color: WIDGET_COLORS.muted, fontSize: 12.5 }}>{config.inquiryQuestion}</p>
      </header>

      <div role="group" aria-label={t.sourceComparison.focusAria} style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "12px 16px 4px" }}>
        {focusOptions.map(([value, label]) => {
          const active = config.comparisonFocus === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...config, comparisonFocus: value })}
              style={{
                minHeight: 36, padding: "6px 13px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${active ? WIDGET_COLORS.accent : WIDGET_COLORS.line}`,
                background: active ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface,
                color: active ? WIDGET_COLORS.accent : WIDGET_COLORS.muted, fontSize: 12,
              }}
            >{label}</button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${config.sources.length}, minmax(180px, 1fr))`, gap: 10, overflowX: "auto", padding: 12 }}>
        {comparison.rows.map((row, index) => {
          const source = config.sources[index];
          const tone = [WIDGET_COLORS.series1, WIDGET_COLORS.series2, WIDGET_COLORS.series3, WIDGET_COLORS.accent][index];
          return (
            <article key={row.sourceId} style={{ minWidth: 180, padding: 14, border: `1px solid ${selectedSource.id === row.sourceId ? tone : WIDGET_COLORS.line}`, borderTop: `3px solid ${tone}`, borderRadius: 8 }}>
              <button type="button" onClick={() => setSelectedSourceId(row.sourceId)} style={{ width: "100%", padding: 0, border: 0, background: "transparent", color: "inherit", textAlign: "left" }}>
              <div style={{ color: tone, fontSize: 11.5 }}>{msg(t.sourceComparison.sourceNumber, { number: index + 1 })}</div>
              <h3 style={{ margin: "4px 0 0", fontSize: 13.5 }}>{row.title}</h3>
              <p style={{ minHeight: 74, margin: "12px 0", color: WIDGET_COLORS.ink, fontSize: 12.5, lineHeight: 1.55 }}>{row.content}</p>
              <div style={{ paddingTop: 9, borderTop: `1px solid ${WIDGET_COLORS.line}`, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>
                {source.creator}
              </div>
              </button>
            </article>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: 6, padding: "0 16px 14px" }}>
        <label htmlFor={`source-note-${selectedSource.id}`} style={{ color: WIDGET_COLORS.muted, fontSize: 11.5, fontWeight: 650 }}>{t.common.studentAnnotation} · {selectedSource.title}</label>
        <textarea id={`source-note-${selectedSource.id}`} value={annotations[selectedSource.id] ?? ""} placeholder={t.common.annotationPlaceholder} rows={2} onChange={(event) => setAnnotations((current) => ({ ...current, [selectedSource.id]: event.target.value }))} style={{ width: "100%", resize: "vertical", padding: "9px 10px", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 8, background: WIDGET_COLORS.surface, color: WIDGET_COLORS.ink, fontSize: 12 }} />
      </div>

      <div style={{ padding: "0 16px 12px", color: WIDGET_COLORS.muted, fontSize: 11.5 }}>
        {msg(t.sourceComparison.currentFocus, { focus: comparison.focusLabel })}
      </div>
      <p style={{ margin: 0, padding: "10px 16px", borderTop: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft, color: WIDGET_COLORS.muted, fontSize: 10.5, lineHeight: 1.45 }}>{t.common.generatedContentNotice}</p>
    </section>
  );
}
