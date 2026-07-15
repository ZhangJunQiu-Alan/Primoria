"use client";

import { buildSourceComparisonRows, type SourceComparisonConfig } from "@/lib/interactive/components/source-comparison";
import { WIDGET_COLORS } from "./palette";

const FOCUS_OPTIONS = [
  ["provenance", "出处"],
  ["claims", "主张"],
  ["corroboration", "互证"],
  ["limitations", "局限"],
] as const;

export function SourceComparisonWidget({ config, onChange }: {
  config: SourceComparisonConfig;
  onChange: (next: SourceComparisonConfig) => void;
}) {
  const comparison = buildSourceComparisonRows(config);
  return (
    <section style={{ overflow: "hidden", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 10, background: WIDGET_COLORS.surface }} aria-label="材料来源比较">
      <header style={{ padding: "12px 16px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>材料来源比较</div>
        <p style={{ margin: "4px 0 0", color: WIDGET_COLORS.muted, fontSize: 12.5 }}>{config.inquiryQuestion}</p>
      </header>

      <div role="group" aria-label="比较维度" style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "12px 16px 4px" }}>
        {FOCUS_OPTIONS.map(([value, label]) => {
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
            <article key={row.sourceId} style={{ minWidth: 180, padding: 14, border: `1px solid ${WIDGET_COLORS.line}`, borderTop: `3px solid ${tone}`, borderRadius: 8 }}>
              <div style={{ color: tone, fontSize: 11.5 }}>材料 {index + 1}</div>
              <h3 style={{ margin: "4px 0 0", fontSize: 13.5 }}>{row.title}</h3>
              <p style={{ minHeight: 74, margin: "12px 0", color: WIDGET_COLORS.ink, fontSize: 12.5, lineHeight: 1.55 }}>{row.content}</p>
              <div style={{ paddingTop: 9, borderTop: `1px solid ${WIDGET_COLORS.line}`, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>
                {source.creator}
              </div>
            </article>
          );
        })}
      </div>

      <div style={{ padding: "0 16px 14px", color: WIDGET_COLORS.muted, fontSize: 11.5 }}>
        当前比较维度: <b style={{ color: WIDGET_COLORS.accent }}>{comparison.focusLabel}</b>。材料并列不等于它们同样可靠。
      </div>
    </section>
  );
}
