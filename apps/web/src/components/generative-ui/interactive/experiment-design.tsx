"use client";

import { summarizeExperimentDesign, type ExperimentDesignConfig } from "@/lib/interactive/components/experiment-design";
import { WIDGET_COLORS } from "./palette";
import { Readout, SliderRow } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

export function ExperimentDesignWidget({ config, onChange }: { config: ExperimentDesignConfig; onChange: (next: ExperimentDesignConfig) => void }) {
  const summary = summarizeExperimentDesign(config);
  return (
    <WidgetShell componentId="psychology.experiment-design" title="实验设计 · 因果链与控制">
      <div style={{ padding: "16px 18px", borderBottom: `1px solid ${WIDGET_COLORS.line}` }}><small style={{ color: WIDGET_COLORS.series3, fontWeight: 700 }}>假设</small><p style={{ margin: "6px 0 0", color: WIDGET_COLORS.ink, fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: 17, lineHeight: 1.45 }}>{config.hypothesis}</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", padding: 16 }}><div style={{ padding: 12, borderRadius: 8, background: WIDGET_COLORS.accentSoft }}><small style={{ color: WIDGET_COLORS.muted }}>自变量</small><b style={{ display: "block", marginTop: 5, color: WIDGET_COLORS.accent }}>{config.independentVariable}</b></div><span style={{ color: WIDGET_COLORS.series1, fontSize: 24 }}>→</span><div style={{ padding: 12, borderRadius: 8, background: WIDGET_COLORS.surfaceSoft }}><small style={{ color: WIDGET_COLORS.muted }}>因变量</small><b style={{ display: "block", marginTop: 5, color: WIDGET_COLORS.series2 }}>{config.dependentVariable}</b></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 9, padding: "0 14px 14px" }}>{summary.allocations.map((group) => <div key={group.label} style={{ border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 8, padding: 10 }}><b style={{ color: WIDGET_COLORS.ink }}>{group.label}</b><p style={{ margin: "5px 0", color: WIDGET_COLORS.muted, fontSize: 11.5 }}>{group.condition}</p><Readout label="样本" value={group.participants} /></div>)}</div>
      <div style={{ padding: "12px 14px", background: WIDGET_COLORS.surfaceSoft }}><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>{config.controlVariables.map((control) => <Readout key={control} label="控制" value={control} />)}{!summary.hasExplicitControlGroup ? <Readout label="提醒" value="未识别到明确对照组" tone="warn" /> : null}</div><SliderRow label="总样本量" min={4} max={1000} step={1} value={config.sampleSize} onChange={(sampleSize) => onChange({ ...config, sampleSize })} /></div>
    </WidgetShell>
  );
}
