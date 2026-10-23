"use client";

import { calculusValue, computeCalculus, type CalculusLabConfig } from "@/lib/interactive/components/calculus-lab";
import { WIDGET_COLORS as C } from "./palette";
import { SliderRow, SegmentedControl } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function CalculusLabWidget({ config, onChange }: { config: CalculusLabConfig; onChange: (next: CalculusLabConfig) => void }) {
  const t = useSceneLocale();
  const r = computeCalculus(config);
  const set = <K extends keyof CalculusLabConfig>(key: K, value: CalculusLabConfig[K]) => onChange({ ...config, [key]: value });
  const f = (x: number) => calculusValue(config.functionType, x, config.coefficient);
  const maxY = config.functionType === "exponential" ? 16 : 8;
  const p = plotCoordinates(-3, 3, -maxY, maxY);
  const a = config.x0;
  const b = a + config.deltaX;
  const fmt = (v: number | null) => v === null ? t("未定义", "Undefined") : v.toFixed(4);
  const formula = ({ cubic: "x³ − 3x", quadratic: "x²", sine: "sin x", exponential: "eˣ", absolute: "|x|" })[config.functionType];
  const integral = config.mode === "integral";
  return <SceneFrame id="math.calculus-lab" title={t("变化率与面积", "Rates of change & area")} description={`f(x) = ${config.coefficient === 1 ? "" : `${config.coefficient} · `}(${formula}) · ${t("改变参数，观察几何与数值如何一起变化。", "Change a parameter and connect geometry to the numbers.")}`}
    readouts={integral ? [{ label: t("中点和", "Midpoint sum"), value: fmt(r.midpointIntegral) }, { label: t("精确有向积分", "Exact signed integral"), value: fmt(r.exactIntegral) }, { label: t("误差", "Error"), value: fmt(Math.abs(r.midpointIntegral - r.exactIntegral)) }] : [{ label: "Δy / Δx", value: fmt(r.secant) }, { label: "f′(x₀)", value: fmt(r.derivative) }, { label: t("斜率误差", "Slope error"), value: fmt(r.error) }]}
    controls={<>
      <SegmentedControl label={t("观察", "View")} value={config.mode} options={[["secant", t("割线", "Secant")], ["tangent", t("切线", "Tangent")], ["integral", t("面积累积", "Integral")]]} onChange={(v) => set("mode", v)} />
      <SegmentedControl label={t("函数", "Function")} value={config.functionType} options={[["cubic", "x³−3x"], ["quadratic", "x²"], ["sine", "sin x"], ["exponential", "eˣ"], ["absolute", "|x|"]]} onChange={(v) => set("functionType", v)} />
      <SliderRow label="x₀" min={-2} max={2} step={0.05} value={config.x0} onChange={(v) => set("x0", v)} />
      {integral ? <><SliderRow label={t("终点 b", "End b")} min={-2} max={2} step={0.05} value={config.intervalEnd} onChange={(v) => set("intervalEnd", v)} /><SliderRow label={t("分割数", "Partitions")} min={2} max={80} step={1} value={config.subdivisions} onChange={(v) => set("subdivisions", v)} /></> : <SliderRow label="Δx" min={-2} max={2} step={0.01} value={config.deltaX} onChange={(v) => set("deltaX", v)} />}
      <SliderRow label={t("系数", "Scale")} min={0.2} max={2} step={0.1} value={config.coefficient} onChange={(v) => set("coefficient", v)} />
    </>}
    explanation={integral ? t("矩形采用中点高度；阴影在 x 轴下方时贡献负的有向面积。交换起终点会改变积分符号。", "Rectangles use midpoint heights. Regions below the x-axis contribute negative signed area. Reversing the limits reverses the integral.") : r.derivative === null ? t("|x| 在原点左右斜率分别为 −1 和 1，因此不可导；不能用一条割线的斜率代替导数。", "At the origin, |x| has left and right slopes −1 and 1. The derivative does not exist.") : t("橙色割线连接两个采样点，绿色虚线是当前位置的切线。让 Δx 趋近 0，比较平均变化率与瞬时变化率；Δx=0 时不能进行除法。", "The orange secant joins two samples; the dashed green line is the tangent. Shrink Δx to compare average and instantaneous rates. At Δx=0, the quotient is undefined.")}>
    <CartesianPlot xMin={-3} xMax={3} yMin={-maxY} yMax={maxY} label={t("函数、割线、切线和积分矩形", "Function, secant, tangent and integral rectangles")}>
      {integral ? r.rectangles.map((rect, i) => <rect key={i} x={Math.min(p.x(rect.left), p.x(rect.right))} y={Math.min(p.y(0), p.y(rect.height))} width={Math.abs(p.x(rect.right) - p.x(rect.left))} height={Math.abs(p.y(rect.height) - p.y(0))} fill={C.accent} fillOpacity={0.18} stroke={C.accent} strokeWidth={0.6} />) : null}
      <path d={curvePath(f, -3, 3, -maxY, maxY)} stroke={C.series2} strokeWidth={3} fill="none" />
      {!integral && r.derivative !== null ? <path d={curvePath((x) => f(a) + r.derivative! * (x - a), -3, 3, -maxY, maxY)} stroke={C.accent} strokeWidth={2} strokeDasharray="7 5" fill="none" /> : null}
      {config.mode === "secant" && r.secant !== null ? <><path d={curvePath((x) => f(a) + r.secant! * (x - a), -3, 3, -maxY, maxY)} stroke={C.series1} strokeWidth={2} fill="none" /><path d={`M${p.x(a)},${p.y(f(a))}H${p.x(b)}V${p.y(f(b))}`} stroke={C.series1} strokeDasharray="3 4" fill="none" /><circle cx={p.x(b)} cy={p.y(f(b))} r={5} fill={C.series1} /></> : null}
      <circle cx={p.x(a)} cy={p.y(f(a))} r={6} fill={C.series2} stroke={C.surface} strokeWidth={2} />
    </CartesianPlot>
  </SceneFrame>;
}
