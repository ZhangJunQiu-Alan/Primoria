"use client";

import { computeLinearSystem, type LinearSystemConfig } from "@/lib/interactive/components/linear-system";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function LinearSystemWidget({ config, onChange }: { config: LinearSystemConfig; onChange: (next: LinearSystemConfig) => void }) {
  const t = useSceneLocale(), r = computeLinearSystem(config), p = plotCoordinates(-8, 8, -8, 8);
  const names = { unique: t("唯一解", "Unique solution"), parallel: t("平行，无解", "Parallel, no solution"), coincident: t("重合，无穷多解", "Coincident, infinitely many"), line: t("一条直线上的解", "One line of solutions"), all: t("全平面都是解", "Every point is a solution"), inconsistent: t("矛盾，无解", "Inconsistent, no solution") };
  const set = <K extends keyof LinearSystemConfig>(key: K, value: LinearSystemConfig[K]) => onChange({ ...config, [key]: value });
  const fmt = (n: number) => Number(n.toPrecision(5));
  const equations = [[config.a1, config.b1, config.c1], [config.a2, config.b2, config.c2]];
  const inWindow = r.solution && Math.abs(r.solution.x) <= 8 && Math.abs(r.solution.y) <= 8;
  return <SceneFrame id="math.linear-system" title={t("两条约束，能锁定一个点吗？", "Can two constraints determine one point?")} description={t("代数消元与几何交点描述同一组条件。系数按0.1格点精确判别，避免把近似平行误判为重合。", "Elimination and line intersections describe the same constraints. Coefficients lie on a 0.1 grid, allowing exact rank classification.")}
    readouts={[{ label: t("解的类型", "Solution type"), value: names[r.type] }, { label: "det A", value: fmt(r.determinant) }, { label: "x", value: r.solution ? fmt(r.solution.x) : "—" }, { label: "y", value: r.solution ? fmt(r.solution.y) : "—" }]}
    controls={<><SegmentedControl label={t("观察", "View")} value={config.view} options={[["graph", t("交点", "Intersections")], ["elimination", t("消元", "Elimination")]]} onChange={(v) => set("view", v)} />{(["a1", "b1", "c1", "a2", "b2", "c2"] as const).map((key) => <SliderRow key={key} label={key} min={-10} max={10} step={0.1} value={config[key]} onChange={(v) => set(key, v)} />)}</>}
    explanation={<>{config.view === "elimination" ? <p style={{ margin: "0 0 8px", fontVariantNumeric: "tabular-nums" }}>{r.factor1}×① + ({r.factor2})×② ⇒ {fmt(r.remainingCoefficient)}{r.eliminateX ? "y" : "x"} = {fmt(r.remainingConstant)}</p> : null}{t("行列式非零时有唯一交点；行列式为零时要继续区分重合、平行或退化条件。0=0不增加约束，0=非零则使整组无解。图窗为[-8,8]，交点在窗外时只在读数给出，不伪造边界交点。", "A nonzero determinant gives one intersection. Zero determinant requires distinguishing coincident, parallel and degenerate constraints. 0=0 adds no constraint; 0=nonzero makes the system inconsistent. The plot window is [-8,8]; out-of-window solutions remain in the readout.")}</>}>
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "8px 18px", fontSize: 13 }}>{equations.map(([a, b, c], i) => <span key={i} style={{ color: i ? C.series2 : C.series1 }}>{i ? "②" : "①"} {a}x + ({b})y = {c}</span>)}</div>
    <CartesianPlot xMin={-8} xMax={8} yMin={-8} yMax={8} label={t("二元一次方程组的两条直线", "Lines representing a two-variable linear system")}>
      {equations.map(([a, b, c], i) => b !== 0 ? <path key={i} d={curvePath((x) => (c - a * x) / b, -8, 8, -8, 8)} stroke={i ? C.series2 : C.series1} strokeWidth={i ? 2 : 4} strokeDasharray={i ? "8 5" : undefined} fill="none" /> : a !== 0 ? <line key={i} x1={p.x(c / a)} x2={p.x(c / a)} y1={p.y(-8)} y2={p.y(8)} stroke={i ? C.series2 : C.series1} strokeWidth={i ? 2 : 4} strokeDasharray={i ? "8 5" : undefined} /> : null)}
      {inWindow && r.solution ? <circle cx={p.x(r.solution.x)} cy={p.y(r.solution.y)} r={6} fill={C.accent} stroke={C.surface} strokeWidth={2} /> : null}
    </CartesianPlot>
  </SceneFrame>;
}
