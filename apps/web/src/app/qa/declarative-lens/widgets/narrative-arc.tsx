"use client";

import { useState } from "react";
import { analyzeNarrativeArc, type NarrativeArcConfig } from "@/lib/qa/components/narrative-arc";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

const W = 680;
const H = 250;
export function NarrativeArcWidget({ config, onChange }: { config: NarrativeArcConfig; onChange: (next: NarrativeArcConfig) => void }) {
  const analysis = analyzeNarrativeArc(config);
  const [requestedIndex, setRequestedIndex] = useState(0);
  const index = Math.min(requestedIndex, config.beats.length - 1);
  const selected = config.beats[index];
  const points = config.beats.map((beat, beatIndex) => ({ x: 42 + beatIndex / (config.beats.length - 1) * (W - 84), y: H - 36 - beat.tension / 10 * (H - 72) }));
  const path = points.map((point, pointIndex) => `${pointIndex ? "L" : "M"}${point.x},${point.y}`).join(" ");
  return (
    <WidgetShell componentId="literature.narrative-arc" title={`${config.workTitle} · 叙事弧线`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="叙事张力曲线" style={{ display: "block", width: "100%" }}>
        {[0, 5, 10].map((value) => <g key={value}><line x1="36" y1={H - 36 - value / 10 * (H - 72)} x2={W - 24} y2={H - 36 - value / 10 * (H - 72)} stroke={WIDGET_COLORS.line} /><text x="27" y={H - 32 - value / 10 * (H - 72)} textAnchor="end" fontSize="10" fill={WIDGET_COLORS.muted}>{value}</text></g>)}
        <path d={path} fill="none" stroke={WIDGET_COLORS.series3} strokeWidth="3" />
        {points.map((point, pointIndex) => <g key={config.beats[pointIndex].id} onClick={() => setRequestedIndex(pointIndex)} style={{ cursor: "pointer" }}><circle cx={point.x} cy={point.y} r={pointIndex === index ? 8 : 5} fill={pointIndex === analysis.climaxIndex ? WIDGET_COLORS.series1 : WIDGET_COLORS.series2} stroke={WIDGET_COLORS.surface} strokeWidth="2" /><text x={point.x} y={H - 14} textAnchor="middle" fontSize="10" fill={WIDGET_COLORS.muted}>{config.beats[pointIndex].stage}</text></g>)}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start", padding: 14, background: WIDGET_COLORS.surfaceSoft }}>
        <div><b style={{ color: WIDGET_COLORS.ink }}>{selected.event}</b><p style={{ margin: "6px 0 0", color: WIDGET_COLORS.muted, fontSize: 12, lineHeight: 1.45 }}>{selected.function}</p></div>
        <Readout label="张力" value={`${selected.tension}/10`} tone={index === analysis.climaxIndex ? "accent" : "default"} />
        <SegmentedControl label="叙事模型" value={config.narrativeForm} options={[["five-part", "五段式"], ["three-act", "三幕式"], ["episodic", "章节式"]]} onChange={(narrativeForm) => onChange({ ...config, narrativeForm })} />
      </div>
    </WidgetShell>
  );
}
