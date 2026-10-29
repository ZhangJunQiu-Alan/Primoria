"use client";

import { useState } from "react";
import { useInteractiveT } from "./i18n";
import { analyzeNarrativeArc, type NarrativeArcConfig } from "@/lib/interactive/components/narrative-arc";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";
import { useSceneLocale } from "./primitives/scene-frame";

const W = 680;
const H = 250;
export function NarrativeArcWidget({ config, onChange }: { config: NarrativeArcConfig; onChange: (next: NarrativeArcConfig) => void }) {
  const t = useInteractiveT().widgets;
  const localize = useSceneLocale();
  const analysis = analyzeNarrativeArc(config);
  const [requestedIndex, setRequestedIndex] = useState(0);
  const index = Math.min(requestedIndex, config.beats.length - 1);
  const selected = config.beats[index];
  const points = config.beats.map((beat, beatIndex) => ({ x: 42 + beatIndex / (config.beats.length - 1) * (W - 84), y: H - 36 - beat.tension / 10 * (H - 72) }));
  const path = points.map((point, pointIndex) => `${pointIndex ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const stages = config.narrativeForm === "five-part"
    ? [localize("铺陈", "Exposition"), localize("上升", "Rising action"), localize("高潮", "Climax"), localize("回落", "Falling action"), localize("结局", "Resolution")]
    : config.narrativeForm === "three-act"
      ? [localize("第一幕 · 建立", "Act I · Setup"), localize("第二幕 · 对抗", "Act II · Confrontation"), localize("第三幕 · 解决", "Act III · Resolution")]
      : config.beats.map((_, i) => `${localize("章节", "Episode")} ${i + 1}`);
  return (
    <WidgetShell componentId="literature.narrative-arc" title={`${config.workTitle} · ${t.narrativeSuffix}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.narrativeAria} style={{ display: "block", width: "100%" }}>
        {config.narrativeForm !== "episodic" ? stages.map((stage, i) => <g key={stage}><rect x={36 + i * (W - 60) / stages.length} y="12" width={(W - 60) / stages.length} height={H - 48} fill={i % 2 ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surfaceSoft} /><text x={36 + (i + 0.5) * (W - 60) / stages.length} y="27" textAnchor="middle" fill={WIDGET_COLORS.muted} fontSize={10}>{stage}</text></g>) : null}
        {[0, 5, 10].map((value) => <g key={value}><line x1="36" y1={H - 36 - value / 10 * (H - 72)} x2={W - 24} y2={H - 36 - value / 10 * (H - 72)} stroke={WIDGET_COLORS.line} /><text x="27" y={H - 32 - value / 10 * (H - 72)} textAnchor="end" fontSize="10" fill={WIDGET_COLORS.muted}>{value}</text></g>)}
        {config.narrativeForm === "episodic" ? points.map((point, i) => <line key={config.beats[i].id} x1={point.x} x2={point.x} y1={H - 36} y2={point.y} stroke={WIDGET_COLORS.series3} strokeWidth={16} strokeOpacity={0.4} />) : <path d={path} fill="none" stroke={WIDGET_COLORS.series3} strokeWidth="3" />}
        {points.map((point, pointIndex) => <g key={config.beats[pointIndex].id} onClick={() => setRequestedIndex(pointIndex)} style={{ cursor: "pointer" }}><circle cx={point.x} cy={point.y} r={pointIndex === index ? 8 : 5} fill={pointIndex === analysis.climaxIndex ? WIDGET_COLORS.series1 : WIDGET_COLORS.series2} stroke={WIDGET_COLORS.surface} strokeWidth="2" /><text x={point.x} y={H - 14} textAnchor="middle" fontSize="10" fill={WIDGET_COLORS.muted}>{config.beats[pointIndex].stage}</text></g>)}
      </svg>
      <p data-narrative-model={config.narrativeForm} style={{ margin: "0 14px 12px", color: WIDGET_COLORS.muted, fontSize: 12, lineHeight: 1.6 }}>{config.narrativeForm === "episodic" ? localize("章节式：逐个比较事件张力，不以一条连续弧线预设统一高潮。", "Episodic: compare event tensions individually without presuming a single continuous climax.") : localize("背景分区是所选模型的等宽阅读参考，不是对事件所属幕次的自动判定；原有事件与张力保持原标注。", "The equal-width bands are a reading guide for the selected model, not an automatic assignment of events to acts; authored events and tensions are retained.")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start", padding: 14, background: WIDGET_COLORS.surfaceSoft }}>
        <div><b style={{ color: WIDGET_COLORS.ink }}>{selected.event}</b><p style={{ margin: "6px 0 0", color: WIDGET_COLORS.muted, fontSize: 12, lineHeight: 1.45 }}>{selected.function}</p></div>
        <Readout label={t.tension} value={`${selected.tension}/10`} tone={index === analysis.climaxIndex ? "accent" : "default"} />
        <SegmentedControl label={t.narrativeModel} value={config.narrativeForm} options={[["five-part", t.fivePart], ["three-act", t.threeAct], ["episodic", t.episodic]]} onChange={(narrativeForm) => onChange({ ...config, narrativeForm })} />
      </div>
    </WidgetShell>
  );
}
