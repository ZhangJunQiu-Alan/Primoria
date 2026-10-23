"use client";

import { electricFieldAt, type ElectricFieldConfig } from "@/lib/interactive/components/electric-field";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, PLOT, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function ElectricFieldWidget({ config, onChange }: { config: ElectricFieldConfig; onChange: (next: ElectricFieldConfig) => void }) {
  const t = useSceneLocale(), r = electricFieldAt(config, config.probeX, config.probeY), p = plotCoordinates(-2, 2, -1.5, 1.5);
  const set = <K extends keyof ElectricFieldConfig>(key: K, value: ElectricFieldConfig[K]) => onChange({ ...config, [key]: value });
  return <SceneFrame id="physics.electric-field" title={t("电势为零，电场也为零吗？", "Does zero potential mean zero field?")} description={t("场是矢量，电势是标量。移动探针，分别观察两种叠加。场箭头长度经过压缩，色块只表示电势正负与相对强弱。", "Fields add as vectors; potentials add as scalars. Move the probe to compare them. Arrow lengths are compressed; color shows potential sign and relative magnitude.")}
    readouts={[{ label: "Eₓ", value: r === null ? "—" : r.ex.toFixed(2), unit: "N/C" }, { label: "Eᵧ", value: r === null ? "—" : r.ey.toFixed(2), unit: "N/C" }, { label: "|E|", value: r === null ? "—" : r.magnitude.toFixed(2), unit: "N/C" }, { label: "V", value: r === null ? t("场源奇点", "Source singularity") : r.potential.toFixed(2), unit: "V" }]}
    controls={<><SliderRow label="q₁" min={-10} max={10} step={0.5} value={config.charge1NC} unit="nC" onChange={(v) => set("charge1NC", v)} /><SliderRow label="q₂" min={-10} max={10} step={0.5} value={config.charge2NC} unit="nC" onChange={(v) => set("charge2NC", v)} /><SliderRow label={t("间距", "Separation")} min={0.2} max={2} step={0.1} value={config.separationM} unit="m" onChange={(v) => set("separationM", v)} /><SliderRow label={t("探针 x", "Probe x")} min={-2} max={2} step={0.05} value={config.probeX} unit="m" onChange={(v) => set("probeX", v)} /><SliderRow label={t("探针 y", "Probe y")} min={-1.5} max={1.5} step={0.05} value={config.probeY} unit="m" onChange={(v) => set("probeY", v)} /><SegmentedControl label={t("观察", "View")} value={config.view} options={[["field", t("场矢量", "Field")], ["potential", t("电势分布", "Potential")]]} onChange={(v) => set("view", v)} /><label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showVectors} onChange={(e) => set("showVectors", e.target.checked)} />{t("显示场方向", "Show field directions")}</label></>}
    explanation={r === null ? t("理想点电荷所在位置存在数学奇点，电场和电势不定义。移动探针后再读数；不要把无穷大显示为有限值。", "At an ideal point source, field and potential are singular. Move the probe before reading values.") : t("E = Σkq r̂/r²，V = Σkq/r。异号等量电荷中点的电势为零，但场矢量同向相加；同号等量电荷中点则电场为零而电势非零。箭头不是带电粒子的运动轨迹。", "E = Σkq r̂/r² and V = Σkq/r. At a dipole midpoint, potential cancels while fields reinforce. Equal like charges have zero midpoint field but nonzero potential. Field arrows are not particle paths.")}>
    <CartesianPlot xMin={-2} xMax={2} yMin={-1.5} yMax={1.5} xLabel="x / m" yLabel="y / m" label={t("双点电荷的场矢量与电势", "Two-charge electric field and potential")}>
      {Array.from({ length: 143 }, (_, i) => {
        const x = -1.85 + i % 13 * 3.7 / 12, y = -1.32 + Math.floor(i / 13) * 2.64 / 10, v = electricFieldAt(config, x, y);
        if (!v) return null;
        const length = 14 * Math.tanh(v.magnitude / 30), dx = v.ex * (PLOT.right - PLOT.left) / 4, dy = -v.ey * (PLOT.bottom - PLOT.top) / 3;
        return <g key={i}>{config.view === "potential" ? <rect x={p.x(x) - 24} y={p.y(y) - 14} width={48} height={28} fill={v.potential >= 0 ? C.warn : C.series2} fillOpacity={Math.abs(Math.tanh(v.potential / 40)) * 0.3} /> : null}{config.showVectors && length > 0.1 ? <g transform={`translate(${p.x(x)},${p.y(y)}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`}><path d={`M${-length / 2},0H${length / 2}m-4,-3l4,3l-4,3`} fill="none" stroke={C.muted} strokeWidth={1.3} /></g> : null}</g>;
      })}
      {[[-config.separationM / 2, config.charge1NC], [config.separationM / 2, config.charge2NC]].map(([x, q], i) => <g key={i}><circle cx={p.x(x)} cy={p.y(0)} r={13} fill={q > 0 ? C.warn : q < 0 ? C.series2 : C.muted} stroke={C.surface} strokeWidth={2} /><text x={p.x(x)} y={p.y(0) + 5} textAnchor="middle" fill={C.surface} fontSize={17}>{q > 0 ? "+" : q < 0 ? "−" : "0"}</text></g>)}
      <circle cx={p.x(config.probeX)} cy={p.y(config.probeY)} r={7} stroke={C.accent} strokeWidth={3} fill={C.surface} />
    </CartesianPlot>
  </SceneFrame>;
}
