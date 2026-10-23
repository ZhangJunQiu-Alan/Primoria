"use client";

import { computeQuadraticEquation, type QuadraticEquationConfig } from "@/lib/interactive/components/quadratic-equation";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SvgDragHandle, useDragViewport, PlotViewportControls } from "./primitives/svg-drag-handle";
import { CartesianPlot, curvePath, quadraticSceneXRange, plotCoordinates, SceneFrame, unplotCoordinates, useSceneLocale } from "./primitives/scene-frame";

export function QuadraticEquationWidget({ config, onChange }: { config: QuadraticEquationConfig; onChange: (next: QuadraticEquationConfig) => void }) {
  const t = useSceneLocale(), r = computeQuadraticEquation(config);
  const f = (x: number) => config.a * x * x + config.b * x + config.c;
  const rawX = quadraticSceneXRange([...r.roots, ...(r.vertex ? [r.vertex.x] : [])]);
  const samples = [rawX.xMin, rawX.xMax, 0, ...(r.vertex && r.vertex.x >= rawX.xMin && r.vertex.x <= rawX.xMax ? [r.vertex.x] : [])].map(f);
  const rawMin = Math.min(-2, ...samples), rawMax = Math.max(2, ...samples), padding = (rawMax - rawMin) * 0.18;
  const dragViewport = useDragViewport({ ...rawX, yMin: rawMin - padding, yMax: rawMax + padding });
  const { xMin, xMax, yMin, yMax } = dragViewport.viewport;
  const p = plotCoordinates(xMin, xMax, yMin, yMax), fmt = (v: number) => Number(v.toPrecision(5));
  const roots = r.complex && config.domain === "complex" ? `${fmt(r.complex.real)} ± ${fmt(r.complex.imaginary)}i` : r.kind === "identity" ? t("任意实数", "All real numbers") : r.roots.length ? r.roots.map(fmt).join(", ") : t("无实根", "No real roots");
  const set = <K extends keyof QuadraticEquationConfig>(key: K, value: QuadraticEquationConfig[K]) => onChange({ ...config, [key]: value });
  const moveVertex = (sx: number, sy: number) => {
    const point = unplotCoordinates(sx, sy, xMin, xMax, yMin, yMax);
    const b = Math.round(-2 * config.a * point.x * 100) / 100, c = Math.round((config.a * point.x ** 2 + point.y) * 100) / 100;
    if (Math.abs(b) <= 8 && Math.abs(c) <= 8) onChange({ ...config, b, c });
  };
  const moveOpening = (sx: number, sy: number) => {
    if (!r.vertex) return;
    const point = unplotCoordinates(sx, sy, xMin, xMax, yMin, yMax), dx = point.x - r.vertex.x;
    if (Math.abs(dx) < 0.2) return;
    const a = Math.round((point.y - r.vertex.y) / dx ** 2 * 100) / 100;
    const b = Math.round(-2 * a * r.vertex.x * 100) / 100, c = Math.round((a * r.vertex.x ** 2 + r.vertex.y) * 100) / 100;
    if (a !== 0 && Math.abs(a) <= 4 && Math.abs(b) <= 8 && Math.abs(c) <= 8) onChange({ ...config, a, b, c });
  };
  return <SceneFrame id="math.quadratic-equation" title={t("根的数量，藏在抛物线与横轴之间", "Roots connect the parabola with the horizontal axis")} description={`f(x) = ${config.a}x² + (${config.b})x + (${config.c}) · ${t("零点表示实根；拖动标记或使用滑块，适配视图可重新取景。", "Zeros are real roots. Drag markers or use sliders, and choose Fit view to reframe.")}`}
    readouts={[{ label: "Δ = b²−4ac", value: r.discriminant === null ? "—" : fmt(r.discriminant) }, { label: r.complex && config.domain === "complex" ? t("复根", "Complex roots") : t("实根", "Real roots"), value: roots }, { label: t("顶点", "Vertex"), value: r.vertex ? `(${fmt(r.vertex.x)}, ${fmt(r.vertex.y)})` : "—" }]}
    controls={<><PlotViewportControls onZoom={dragViewport.zoom} onFit={dragViewport.fit} disabled={dragViewport.dragging} labels={[t("放大视图", "Zoom in"), t("缩小视图", "Zoom out"), t("适配视图", "Fit view")]} />{(["a", "b", "c"] as const).map((key) => <SliderRow key={key} label={key} min={key === "a" ? -4 : -8} max={key === "a" ? 4 : 8} step={0.01} value={config[key]} onChange={(v) => set(key, v)} />)}<SegmentedControl label={t("观察", "View")} value={config.view} options={[["roots", t("方程的根", "Roots")], ["vertex", t("配方与顶点", "Vertex form")]]} onChange={(v) => set("view", v)} /><SegmentedControl label={t("数的范围", "Number domain")} value={config.domain} options={[["real", t("实数", "Real")], ["complex", t("复数", "Complex")]]} onChange={(v) => set("domain", v)} /><label style={{ color: C.muted, fontSize: 12 }}><input type="checkbox" checked={config.showAxis} onChange={(e) => set("showAxis", e.target.checked)} />{t("显示对称轴", "Show symmetry axis")}</label></>}
    explanation={<>{config.view === "vertex" && r.vertex ? <p style={{ margin: "0 0 8px" }}>f(x) = {config.a}(x − ({fmt(r.vertex.x)}))² + ({fmt(r.vertex.y)})</p> : null}{config.a === 0 ? t("a=0，方程已经不是二次方程。b非零时只有一个一次方程的根；a=b=0时，由c是否为零区分恒等与矛盾，不能套用二次求根式。", "When a=0 the equation is linear. If b is also zero, c distinguishes an identity from an inconsistency; the quadratic formula does not apply.") : t("Δ>0有两个不同实根，Δ=0有一个二重实根，Δ<0没有实根；切换到复数范围可查看共轭复根，但不会把它们画成实横轴上的交点。系数保留0.01格点，以整数缩放精确判别Δ的符号；配方和根的计算都来自同一方程。", "Δ>0 gives two distinct real roots, Δ=0 a repeated root, and Δ<0 no real roots. Switch to the complex domain to inspect conjugate roots, which are not real-axis intersections. Coefficients use a 0.01 grid and integer-scaled discriminant classification.")}</>}>
    <CartesianPlot xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} label={t("二次函数、实根与顶点", "Quadratic curve, real roots and vertex")}>
      {config.showAxis && r.vertex ? <line x1={p.x(r.vertex.x)} x2={p.x(r.vertex.x)} y1={p.y(yMin)} y2={p.y(yMax)} stroke={C.muted} strokeDasharray="6 5" /> : null}
      <path d={curvePath(f, xMin, xMax, yMin, yMax)} fill="none" stroke={C.series1} strokeWidth={3} />
      {r.roots.filter((x) => x >= xMin && x <= xMax).map((x, i) => <circle key={i} cx={p.x(x)} cy={p.y(0)} r={6} fill={C.series2} stroke={C.surface} strokeWidth={2} />)}
      {r.vertex && r.vertex.x >= xMin && r.vertex.x <= xMax ? <circle cx={p.x(r.vertex.x)} cy={p.y(r.vertex.y)} r={5} fill={C.accent} /> : null}
      {r.vertex && (dragViewport.dragging || r.vertex.x > xMin + 0.1 && r.vertex.x < xMax - 0.1) ? <SvgDragHandle x={p.x(r.vertex.x)} y={p.y(r.vertex.y)} label={t("拖动顶点；也可使用参数滑块", "Drag vertex; parameter sliders are also available")} tone={C.accent} onDragStart={dragViewport.lock} onDragEnd={dragViewport.release} onMove={moveVertex} /> : null}
      {r.vertex && (dragViewport.dragging || r.vertex.x + 2 < xMax - 0.1 && r.vertex.x + 2 > xMin + 0.1) ? <SvgDragHandle x={p.x(r.vertex.x + 2)} y={p.y(f(r.vertex.x + 2))} label={t("拖动调整开口；也可使用a滑块", "Drag to adjust curvature; the a slider is also available")} tone={C.series1} onDragStart={dragViewport.lock} onDragEnd={dragViewport.release} onMove={moveOpening} /> : null}
    </CartesianPlot>
  </SceneFrame>;
}
