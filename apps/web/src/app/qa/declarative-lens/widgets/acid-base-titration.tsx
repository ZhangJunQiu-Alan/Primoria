"use client";

import { computeTitration, type AcidBaseTitrationConfig } from "@/lib/qa/components/acid-base-titration";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl, SliderRow } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

const W = 680;
const H = 270;
const PAD = 36;
const INDICATOR_RANGES = { phenolphthalein: [8.2, 10], "methyl-orange": [3.1, 4.4] } as const;

function curvePath(config: AcidBaseTitrationConfig) {
  const points: string[] = [];
  for (let index = 0; index <= 100; index += 1) {
    const volume = index;
    const { pH } = computeTitration({ ...config, addedBaseVolume: volume });
    const x = PAD + volume / 100 * (W - PAD * 2);
    const y = H - PAD - Math.max(0, Math.min(14, pH)) / 14 * (H - PAD * 2);
    points.push(`${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export function AcidBaseTitrationWidget({ config, onChange }: { config: AcidBaseTitrationConfig; onChange: (next: AcidBaseTitrationConfig) => void }) {
  const result = computeTitration(config);
  const markerX = PAD + config.addedBaseVolume / 100 * (W - PAD * 2);
  const markerY = H - PAD - result.pH / 14 * (H - PAD * 2);
  const range = config.indicator === "none" ? null : INDICATOR_RANGES[config.indicator];
  const set = <K extends keyof AcidBaseTitrationConfig>(key: K, value: AcidBaseTitrationConfig[K]) => onChange({ ...config, [key]: value });
  return (
    <WidgetShell componentId="chem.acid-base-titration" title="强酸强碱滴定 · 交互曲线">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="滴定 pH 曲线" style={{ display: "block", width: "100%", background: WIDGET_COLORS.surface }}>
        {range ? <rect x={PAD} y={H - PAD - range[1] / 14 * (H - PAD * 2)} width={W - PAD * 2} height={(range[1] - range[0]) / 14 * (H - PAD * 2)} fill={WIDGET_COLORS.accentSoft} /> : null}
        {[0, 7, 14].map((pH) => <g key={pH}><line x1={PAD} y1={H - PAD - pH / 14 * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - pH / 14 * (H - PAD * 2)} stroke={WIDGET_COLORS.line} /><text x={PAD - 8} y={H - PAD - pH / 14 * (H - PAD * 2) + 4} textAnchor="end" fontSize="10" fill={WIDGET_COLORS.muted}>{pH}</text></g>)}
        <path d={curvePath(config)} fill="none" stroke={WIDGET_COLORS.series2} strokeWidth="3" strokeLinecap="round" />
        <line x1={PAD + result.equivalenceVolume / 100 * (W - PAD * 2)} y1={PAD} x2={PAD + result.equivalenceVolume / 100 * (W - PAD * 2)} y2={H - PAD} stroke={WIDGET_COLORS.series3} strokeDasharray="5 4" />
        <circle cx={markerX} cy={markerY} r="6" fill={WIDGET_COLORS.series1} stroke={WIDGET_COLORS.surface} strokeWidth="2" />
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={WIDGET_COLORS.muted}>加入碱的体积 / mL</text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "10px 14px 2px" }}>
        <Readout label="当前 pH" value={result.pH.toFixed(2)} tone={result.state === "equivalence" ? "accent" : "default"} />
        <Readout label="等当点" value={`${result.equivalenceVolume.toFixed(1)} mL`} />
        <Readout label="区域" value={result.state === "acidic" ? "酸过量" : result.state === "basic" ? "碱过量" : "等当点"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: "9px 22px", padding: 14 }}>
        <SliderRow label="加碱体积" min={0} max={100} step={0.1} value={config.addedBaseVolume} unit=" mL" onChange={(value) => set("addedBaseVolume", value)} />
        <SliderRow label="酸浓度" min={0.01} max={0.5} step={0.01} value={config.acidConcentration} unit=" M" onChange={(value) => set("acidConcentration", value)} />
        <SliderRow label="酸体积" min={10} max={50} step={1} value={config.acidVolume} unit=" mL" onChange={(value) => set("acidVolume", value)} />
        <SliderRow label="碱浓度" min={0.01} max={0.5} step={0.01} value={config.baseConcentration} unit=" M" onChange={(value) => set("baseConcentration", value)} />
        <SegmentedControl label="指示剂" value={config.indicator} options={[["phenolphthalein", "酚酞"], ["methyl-orange", "甲基橙"], ["none", "无"]]} onChange={(value) => set("indicator", value)} />
      </div>
    </WidgetShell>
  );
}
