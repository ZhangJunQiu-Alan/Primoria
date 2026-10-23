"use client";

import { computeRefraction, type RefractionLabConfig } from "@/lib/interactive/components/refraction-lab";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function RefractionLabWidget({ config, onChange }: { config: RefractionLabConfig; onChange: (next: RefractionLabConfig) => void }) {
  const t = useSceneLocale();
  const r = computeRefraction(config);
  const set = <K extends keyof RefractionLabConfig>(key: K, value: RefractionLabConfig[K]) => onChange({ ...config, [key]: value });
  const angle = config.incidenceDeg * Math.PI / 180;
  const refracted = (r.refractionDeg ?? 90) * Math.PI / 180;
  const percentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  return <SceneFrame id="physics.refraction-lab" title={t("光在界面发生了什么？", "What happens at an optical boundary?")} description={t("入射角相对法线测量。调整两侧介质，比较光线方向与能量分配。", "Angles are measured from the normal. Change either medium to compare ray directions and energy transfer.")}
    readouts={[{ label: t("折射角", "Refracted angle"), value: r.refractionDeg === null ? t("无传播光线", "No transmitted ray") : r.refractionDeg.toFixed(2), unit: r.refractionDeg === null ? undefined : "°" }, { label: t("反射能量", "Reflected power"), value: percentage(r.reflectance) }, { label: t("临界角", "Critical angle"), value: r.criticalDeg === null ? "—" : r.criticalDeg.toFixed(2), unit: r.criticalDeg === null ? undefined : "°" }]}
    controls={<>
      <SegmentedControl label={t("观察", "View")} value={config.mode} options={[["rays", t("光路", "Rays")], ["reflectance", t("反射率曲线", "Reflectance")]]} onChange={(v) => set("mode", v)} />
      <SliderRow label="n₁" min={0.8} max={2.5} step={0.01} value={config.n1} onChange={(v) => set("n1", v)} />
      <SliderRow label="n₂" min={0.8} max={2.5} step={0.01} value={config.n2} onChange={(v) => set("n2", v)} />
      <SliderRow label={t("入射角", "Incidence")} min={0} max={89.5} step={0.5} value={config.incidenceDeg} unit="°" onChange={(v) => set("incidenceDeg", v)} />
      <SegmentedControl label={t("偏振", "Polarization")} value={config.polarization} options={[["unpolarized", t("自然光", "Unpolarized")], ["s", "s"], ["p", "p"]]} onChange={(v) => set("polarization", v)} />
      <label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showAngles} onChange={(e) => set("showAngles", e.target.checked)} /> {t("标注角度", "Label angles")}</label>
    </>}
    explanation={<><strong>n₁ sin θ₁ = n₂ sin θ₂</strong><br />{r.totalInternalReflection ? t("进入低折射率介质的角度超过临界条件，出现全反射。这里没有传播的折射光线，反射能量为 100%。", "The ray reaches the critical condition toward a lower-index medium: total internal reflection. There is no propagating transmitted ray.") : t("进入更高折射率的介质时向法线偏折，速度变小。曲线按无吸收界面的菲涅耳公式计算，R + T = 1；示意光线宽度并非能量刻度。", "A higher index bends the ray toward the normal and reduces its speed. The lossless Fresnel model gives R + T = 1. Ray widths are schematic.")}</>}>
    {config.mode === "reflectance" ? <CartesianPlot xMin={0} xMax={90} yMin={0} yMax={1} xLabel={t("入射角 / °", "Incidence / °")} yLabel="R" label={t("反射率随入射角变化", "Reflectance versus incidence angle")}>
      <path d={curvePath((a) => computeRefraction({ ...config, incidenceDeg: Math.min(89.999, a) }).reflectance, 0, 90, 0, 1)} stroke={C.series2} strokeWidth={3} fill="none" />
      <circle cx={56 + config.incidenceDeg / 90 * 598} cy={290 - r.reflectance * 264} r={5} fill={C.series1} />
    </CartesianPlot> : <svg viewBox="0 0 680 330" role="img" aria-label={t("界面光路图，虚线为法线", "Ray diagram; dashed line is the normal")} style={{ display: "block", width: "100%" }}>
      <rect x={20} y={20} width={640} height={145} rx={12} fill={C.series1} fillOpacity={0.045} />
      <rect x={20} y={165} width={640} height={145} rx={12} fill={C.series2} fillOpacity={0.09} />
      <line x1={20} x2={660} y1={165} y2={165} stroke={C.muted} strokeWidth={1.5} />
      <line x1={340} x2={340} y1={28} y2={303} stroke={C.muted} strokeDasharray="5 5" />
      <path d={`M${340 - 140 * Math.sin(angle)},${165 - 140 * Math.cos(angle)}L340,165`} stroke={C.series1} strokeWidth={4} fill="none" />
      <path d={`M340,165L${340 + 140 * Math.sin(angle)},${165 - 140 * Math.cos(angle)}`} stroke={C.warn} strokeWidth={3} strokeDasharray="8 4" fill="none" />
      {r.refractionDeg === null ? null : <path d={`M340,165L${340 + 140 * Math.sin(refracted)},${165 + 140 * Math.cos(refracted)}`} stroke={C.series2} strokeWidth={4} fill="none" />}
      <circle cx={340} cy={165} r={5} fill={C.ink} />
      <text x={40} y={48} fontSize={15} fill={C.muted}>n₁ = {config.n1.toFixed(2)}</text><text x={40} y={290} fontSize={15} fill={C.muted}>n₂ = {config.n2.toFixed(2)}</text>
      {config.showAngles ? <>
        {config.incidenceDeg > 0 ? <path d={`M340,120A45,45 0 0 0 ${340 - 45 * Math.sin(angle)},${165 - 45 * Math.cos(angle)}`} stroke={C.series1} fill="none" /> : null}
        {r.refractionDeg !== null && r.refractionDeg > 0 ? <path d={`M340,210A45,45 0 0 0 ${340 + 45 * Math.sin(refracted)},${165 + 45 * Math.cos(refracted)}`} stroke={C.series2} fill="none" /> : null}
        <text x={190} y={100} textAnchor="end" fontSize={15} fill={C.series1}>θ₁ = {config.incidenceDeg}°</text><text x={465} y={246} fontSize={15} fill={C.series2}>{r.refractionDeg === null ? t("全反射", "Total reflection") : `θ₂ = ${r.refractionDeg.toFixed(1)}°`}</text>
      </> : null}
      <text x={570} y={42} fill={C.warn} fontSize={12} textAnchor="end">R = {percentage(r.reflectance)}</text><text x={620} y={295} fill={C.series2} fontSize={12} textAnchor="end">T = {percentage(r.transmittance)}</text>
    </svg>}
  </SceneFrame>;
}
