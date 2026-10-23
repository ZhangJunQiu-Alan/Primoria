"use client";

import { computeParabolaIntersections, type ParabolaIntersectionsConfig } from "@/lib/interactive/components/parabola-intersections";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SvgDragHandle, useDragViewport, PlotViewportControls } from "./primitives/svg-drag-handle";
import { CartesianPlot, curvePath, quadraticSceneXRange, plotCoordinates, SceneFrame, unplotCoordinates, useSceneLocale } from "./primitives/scene-frame";

export function ParabolaIntersectionsWidget({ config, onChange }: { config: ParabolaIntersectionsConfig; onChange: (next: ParabolaIntersectionsConfig) => void }) {
  const t = useSceneLocale(), r = computeParabolaIntersections(config);
  const f = (x: number) => config.a * x * x + config.b * x + config.c, line = (x: number) => r.slope * x + config.intercept;
  const rawX = quadraticSceneXRange([...r.roots, ...(r.vertex ? [r.vertex.x] : []), ...(r.bridgeValid ? r.foundationRoots : [])]);
  const ys = [rawX.xMin, rawX.xMax, 0, ...(r.vertex && r.vertex.x >= rawX.xMin && r.vertex.x <= rawX.xMax ? [r.vertex.x] : [])].map(f).concat([line(rawX.xMin), line(rawX.xMax)]);
  const rawMin = r.bridgeValid ? 0 : Math.min(-2, ...ys), rawMax = Math.max(2, ...ys), padding = (rawMax - rawMin) * 0.18;
  const dragViewport = useDragViewport({ ...rawX, yMin: rawMin - padding, yMax: rawMax + padding });
  const { xMin, xMax, yMin, yMax } = dragViewport.viewport;
  const p = plotCoordinates(xMin, xMax, yMin, yMax), fmt = (n: number) => Number(n.toPrecision(5));
  const set = <K extends keyof ParabolaIntersectionsConfig>(key: K, value: ParabolaIntersectionsConfig[K]) => onChange({ ...config, [key]: value });
  const count = r.kind === "identity" ? t("整条直线", "Coincident lines") : r.points.length;
  const moveVertex = (sx: number, sy: number) => {
    const point = unplotCoordinates(sx, sy, xMin, xMax, yMin, yMax);
    const b = Math.round(-2 * config.a * point.x * 100) / 100, c = Math.round((config.a * point.x ** 2 + point.y) * 100) / 100;
    if (Math.abs(b) <= 12 && Math.abs(c) <= 12) onChange({ ...config, b, c });
  };
  const moveOpening = (sx: number, sy: number) => {
    if (!r.vertex) return;
    const point = unplotCoordinates(sx, sy, xMin, xMax, yMin, yMax), dx = point.x - r.vertex.x;
    if (Math.abs(dx) < 0.2) return;
    const a = Math.round((point.y - r.vertex.y) / dx ** 2 * 100) / 100;
    const b = Math.round(-2 * a * r.vertex.x * 100) / 100, c = Math.round((a * r.vertex.x ** 2 + r.vertex.y) * 100) / 100;
    if (a !== 0 && Math.abs(a) <= 4 && Math.abs(b) <= 12 && Math.abs(c) <= 12) onChange({ ...config, a, b, c });
  };
  return <SceneFrame id="math.parabola-intersections" title={t("交点会移动，判别式也要跟着移项", "Move the line, then update the discriminant")} description={`y=${config.a}x²+(${config.b})x+(${config.c})；y=${r.slope}x+(${config.intercept}) · ${t("可拖动标记或使用滑块，视窗保持稳定；需要时用适配视图重新取景。", "Drag markers or use sliders while the viewport stays stable. Use Fit view to reframe nearby features.")}`}
    readouts={[{ label: t("交点数", "Intersections"), value: count }, { label: "x₁", value: r.points[0] ? fmt(r.points[0].x) : "—" }, { label: "x₂", value: r.points[1] ? fmt(r.points[1].x) : "—" }, { label: t("移项后 Δ", "Reduced Δ"), value: r.discriminant === null ? "—" : fmt(r.discriminant) }, { label: r.bridgeValid ? t("水面处开口宽度", "Opening at water level") : t("横坐标差 Δx", "Horizontal gap Δx"), value: r.gap === null ? r.bridgeValid ? "0" : "—" : fmt(r.gap) }, { label: t("斜弦长度", "Chord length"), value: r.chord === null ? "—" : fmt(r.chord) }, { label: "x₁+x₂", value: r.rootSum === null ? "—" : fmt(r.rootSum) }, { label: "x₁x₂", value: r.rootProduct === null ? "—" : fmt(r.rootProduct) }]}
    controls={<><PlotViewportControls onZoom={dragViewport.zoom} onFit={dragViewport.fit} disabled={dragViewport.dragging} labels={[t("放大视图", "Zoom in"), t("缩小视图", "Zoom out"), t("适配视图", "Fit view")]} /><SegmentedControl label={t("场景", "Scenario")} value={config.scene} options={[["horizontal", t("水平截线", "Horizontal")], ["line", t("斜线联立", "Oblique line")], ["bridge", t("拱桥水位", "Bridge water")]]} onChange={(v) => v === "bridge" ? onChange({ ...config, scene: v, a: -0.4, b: 0, c: 9, slope: 0, intercept: 3 }) : set("scene", v)} />{(["a", "b", "c"] as const).map((key) => <SliderRow key={key} label={key} min={key === "a" ? -4 : -12} max={key === "a" ? 4 : 12} step={0.01} value={config[key]} onChange={(v) => set(key, v)} />)}{config.scene === "line" ? <SliderRow label={t("直线斜率 m", "Line slope m")} min={-4} max={4} step={0.01} value={config.slope} onChange={(v) => set("slope", v)} /> : null}<SliderRow label={config.scene === "bridge" ? t("水位 H", "Water level H") : t("截距 k", "Intercept k")} min={-12} max={12} step={0.01} value={config.intercept} onChange={(v) => set("intercept", v)} /><label style={{ color: C.muted, fontSize: 12 }}><input type="checkbox" checked={config.showDistance} onChange={(e) => set("showDistance", e.target.checked)} />{t("强调交点弦", "Emphasize intersection chord")}</label></>}
    explanation={<><p style={{ margin: "0 0 8px" }}>{config.a}x²+({r.reducedB})x+({r.reducedC})=0</p>{t("先把直线移到左边，再用新系数判别：Δ=(b−m)²−4a(c−k)。两个实交点的横坐标差为√Δ/|a|；斜弦还需乘√(1+m²)。a=0时按一次约束解释，不套二次公式。", "Subtract the line first: Δ=(b−m)²−4a(c−k). With two real intersections, Δx=√Δ/|a| and chord length=Δx√(1+m²). When a=0 use linear constraints instead of the quadratic formula.")}{config.scene === "bridge" ? <p style={{ margin: "8px 0 0" }}>{r.bridgeValid ? t("以向下抛物线y≥0部分近似桥孔，水平线表示水位；宽度是该水位处两侧交点的水平间距。水位到达顶点时宽度为0，高于顶点时没有开放水道。它不是船高净空计算。", "The nonnegative part of a downward parabola approximates the opening; the horizontal line is water level. The width is the horizontal separation of its intersections, reaching zero at the vertex. Above the vertex no opening remains. This measures water-level width, not vessel headroom.") : t("当前参数不满足向下桥拱、正顶点与非负水位条件，画面只作函数求交示意。", "Current parameters do not define a downward arch with positive vertex and nonnegative water level; interpret this as function intersections.")}</p> : null}</>}>
    <CartesianPlot xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} label={t("抛物线与直线交点及弦长", "Parabola-line intersections and chord length")}>
      {r.bridgeValid ? <rect x={p.x(xMin)} y={p.y(config.intercept)} width={p.x(xMax) - p.x(xMin)} height={p.y(yMin) - p.y(config.intercept)} fill={C.series2} fillOpacity={0.12} /> : null}
      <path d={curvePath(f, xMin, xMax, yMin, yMax)} stroke={C.series1} strokeWidth={3} fill="none" /><path d={curvePath(line, xMin, xMax, yMin, yMax)} stroke={C.series2} strokeWidth={2} strokeDasharray="7 5" fill="none" />
      {config.showDistance && r.points.length === 2 ? <line x1={p.x(r.points[0].x)} y1={p.y(r.points[0].y)} x2={p.x(r.points[1].x)} y2={p.y(r.points[1].y)} stroke={C.accent} strokeWidth={5} /> : null}
      {r.points.filter((point) => point.x >= xMin && point.x <= xMax).map((point, i) => <circle key={i} cx={p.x(point.x)} cy={p.y(point.y)} r={6} fill={C.series2} stroke={C.surface} strokeWidth={2} />)}
      {r.vertex && (dragViewport.dragging || r.vertex.x > xMin + 0.1 && r.vertex.x < xMax - 0.1) ? <SvgDragHandle x={p.x(r.vertex.x)} y={p.y(r.vertex.y)} label={t("拖动顶点；也可使用参数滑块", "Drag vertex; parameter sliders are also available")} tone={C.accent} onDragStart={dragViewport.lock} onDragEnd={dragViewport.release} onMove={moveVertex} /> : null}
      {r.vertex && (dragViewport.dragging || r.vertex.x + 2 < xMax - 0.1 && r.vertex.x + 2 > xMin + 0.1) ? <SvgDragHandle x={p.x(r.vertex.x + 2)} y={p.y(f(r.vertex.x + 2))} label={t("拖动调整开口；也可使用a滑块", "Drag to adjust curvature; the a slider is also available")} tone={C.series1} onDragStart={dragViewport.lock} onDragEnd={dragViewport.release} onMove={moveOpening} /> : null}
      <SvgDragHandle x={p.x(xMax - (xMax - xMin) * 0.1)} y={p.y(r.slope * (xMax - (xMax - xMin) * 0.1) + config.intercept)} label={t("拖动直线高度；也可使用截距滑块", "Drag line height; the intercept slider is also available")} tone={C.series2} onDragStart={dragViewport.lock} onDragEnd={dragViewport.release} onMove={(sx, sy) => { const point = unplotCoordinates(sx, sy, xMin, xMax, yMin, yMax), intercept = Math.round((point.y - r.slope * point.x) * 100) / 100; if (Math.abs(intercept) <= 12) set("intercept", intercept); }} />
    </CartesianPlot>
  </SceneFrame>;
}
