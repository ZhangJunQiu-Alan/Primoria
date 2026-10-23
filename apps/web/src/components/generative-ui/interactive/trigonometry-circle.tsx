"use client";

import { computeTrigonometry, type TrigonometryCircleConfig } from "@/lib/interactive/components/trigonometry-circle";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function TrigonometryCircleWidget({ config, onChange }: { config: TrigonometryCircleConfig; onChange: (next: TrigonometryCircleConfig) => void }) {
  const t = useSceneLocale();
  const r = computeTrigonometry(config);
  const set = <K extends keyof TrigonometryCircleConfig>(key: K, value: TrigonometryCircleConfig[K]) => onChange({ ...config, [key]: value });
  const cx = 300, cy = 170, radius = 122, px = cx + r.cos * radius, py = cy - r.sin * radius;
  const ymax = config.functionType === "tan" ? 4 : 1.5;
  const p = plotCoordinates(-360, 360, -ymax, ymax);
  const graphFn = (degrees: number) => { const a = degrees * Math.PI / 180; return config.functionType === "sin" ? Math.sin(a) : config.functionType === "cos" ? Math.cos(a) : Math.abs(Math.cos(a)) < 0.04 ? null : Math.tan(a); };
  const graphAngle = ((config.angleDeg + 360) % 720 + 720) % 720 - 360;
  const graphValue = config.functionType === "sin" ? r.sin : config.functionType === "cos" ? r.cos : r.tan;
  return <SceneFrame id="math.trigonometry-circle" title={t("一个转动的点，三种比值", "One rotating point, three ratios")} description={t("从圆上坐标读取三角函数。圆半径改变时，坐标改变，比值保持不变。", "Read trigonometric ratios from circular coordinates. Changing the radius changes coordinates, not their ratios.")}
    readouts={[{ label: "sin θ = y/r", value: r.sin.toFixed(4) }, { label: "cos θ = x/r", value: r.cos.toFixed(4) }, { label: "tan θ = y/x", value: r.tan === null ? t("未定义", "Undefined") : r.tan.toFixed(4) }]}
    controls={<>
      <SliderRow label={t("转角", "Angle")} min={-720} max={720} step={1} value={config.angleDeg} unit="°" onChange={(v) => set("angleDeg", v)} />
      <SliderRow label={t("半径", "Radius")} min={0.5} max={3} step={0.1} value={config.radius} onChange={(v) => set("radius", v)} />
      <SegmentedControl label={t("观察", "View")} value={config.mode} options={[["circle", t("圆与投影", "Circle")], ["graph", t("函数图像", "Graph")]]} onChange={(v) => set("mode", v)} />
      <SegmentedControl label={t("函数", "Function")} value={config.functionType} options={[["sin", "sin"], ["cos", "cos"], ["tan", "tan"]]} onChange={(v) => set("functionType", v)} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: C.muted }}><label><input type="checkbox" checked={config.showProjection} onChange={(e) => set("showProjection", e.target.checked)} /> {t("显示坐标投影", "Coordinate projections")}</label><label><input type="checkbox" checked={config.showTangent} onChange={(e) => set("showTangent", e.target.checked)} /> {t("显示正切线", "Tangent line")}</label></div>
    </>}
    explanation={t("sin²θ + cos²θ = 1；余弦对应水平坐标，正弦对应竖直坐标。正切在cosθ=0时未定义。曲线遇到这些位置会断开，不把两侧误连成一条竖直线；图像模式显示角度的等价周期位置。", "sin²θ + cos²θ = 1. Cosine is horizontal and sine is vertical. Tangent is undefined where cosθ=0; its branches are not connected across asymptotes. Graph mode maps the selected angle to an equivalent periodic position.")}>
    {config.mode === "graph" ? <CartesianPlot xMin={-360} xMax={360} yMin={-ymax} yMax={ymax} xLabel="θ / °" yLabel={config.functionType} label={t("三角函数周期图像", "Periodic trigonometric graph")}>
      <path d={curvePath(graphFn, -360, 360, -ymax, ymax, 360)} fill="none" stroke={C.series2} strokeWidth={3} />{graphValue === null ? null : <circle cx={p.x(graphAngle)} cy={p.y(graphValue)} r={6} fill={C.series1} />}
    </CartesianPlot> : <svg viewBox="0 0 680 350" role="img" aria-label={t("圆上点及坐标投影", "Point on a circle with coordinate projections")} style={{ width: "100%", display: "block" }}>
      <circle cx={cx} cy={cy} r={radius} stroke={C.line} fill="none" strokeWidth={2} /><line x1={cx - radius - 30} x2={cx + radius + 40} y1={cy} y2={cy} stroke={C.muted} /><line x1={cx} x2={cx} y1={cy - radius - 20} y2={cy + radius + 20} stroke={C.muted} />
      {config.showProjection ? <><path d={`M${px},${cy}V${py}H${cx}`} stroke={C.accent} strokeDasharray="5 5" fill="none" /><path d={`M${cx},${cy}H${px}`} stroke={C.series2} strokeWidth={4} /><path d={`M${px},${cy}V${py}`} stroke={C.accent} strokeWidth={4} /></> : null}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={C.series1} strokeWidth={3} /><circle cx={px} cy={py} r={7} fill={C.series1} stroke={C.surface} strokeWidth={2} />
      {config.showTangent ? <><line x1={cx + radius} x2={cx + radius} y1={20} y2={330} stroke={C.warn} strokeDasharray="4 4" />{r.tan !== null && Math.abs(r.tan) < 1.2 ? <line x1={cx + radius} x2={cx + radius} y1={cy} y2={cy - r.tan * radius} stroke={C.warn} strokeWidth={4} /> : null}</> : null}
      <text x={475} y={115} fill={C.ink} fontSize={16}>θ = {config.angleDeg}°</text><text x={475} y={144} fill={C.muted} fontSize={13}>r = {config.radius}</text><text x={475} y={173} fill={C.series2} fontSize={13}>x = {r.x.toFixed(3)}</text><text x={475} y={202} fill={C.accent} fontSize={13}>y = {r.y.toFixed(3)}</text>
    </svg>}
  </SceneFrame>;
}
