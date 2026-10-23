"use client";

import { useRef } from "react";

import { computeProjectile, type ProjectileLabConfig } from "@/lib/interactive/components/projectile-lab";
import { ScenePlaybackControls, useScenePlayback } from "./primitives/scene-playback";
import { WIDGET_COLORS as C } from "./palette";
import { SliderRow } from "./primitives/controls";
import { CartesianPlot, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function ProjectileLabWidget({ config, onChange }: { config: ProjectileLabConfig; onChange: (next: ProjectileLabConfig) => void }) {
  const t = useSceneLocale();
  const sceneRef = useRef<HTMLDivElement>(null);
  const initial = computeProjectile(config);
  const playback = useScenePlayback(sceneRef, initial.flightTime);
  const r = playback.fraction === null ? initial : computeProjectile({ ...config, progress: playback.fraction });
  const vacuum = computeProjectile({ ...config, drag: 0 });
  const xmax = Math.max(5, vacuum.range * 1.1, r.range * 1.1);
  const ymax = Math.max(5, vacuum.maxHeight * 1.25, r.maxHeight * 1.25);
  const p = plotCoordinates(0, xmax, 0, ymax);
  const path = (trajectory: typeof r.trajectory) => trajectory.map((s, i) => `${i ? "L" : "M"}${p.x(s.x)},${p.y(Math.max(0, s.y))}`).join("");
  const set = <K extends keyof ProjectileLabConfig>(key: K, value: ProjectileLabConfig[K]) => { playback.reset(); onChange({ ...config, [key]: value }); };
  const speed = Math.hypot(r.current.vx, r.current.vy);
  const vectorScale = Math.min(3, 80 / Math.max(1, speed));
  return <div ref={sceneRef}><SceneFrame id="physics.projectile-lab" title={t("一条抛物线，两种运动", "One trajectory, two components")} description={t("水平与竖直速度共用同一个时钟。灰色虚线表示相同初始条件下的无阻力轨迹。", "Horizontal and vertical motion share one clock. The dashed path is the vacuum reference with identical initial conditions.")}
    readouts={[{ label: t("飞行时间", "Flight time"), value: r.flightTime.toFixed(2), unit: "s" }, { label: t("水平射程", "Range"), value: r.range.toFixed(2), unit: "m" }, { label: t("最高点", "Peak height"), value: r.maxHeight.toFixed(2), unit: "m" }, { label: `t = ${r.time.toFixed(2)}s`, value: speed.toFixed(2), unit: "m/s" }]}
    controls={<>
      <ScenePlaybackControls playback={playback} initialFraction={config.progress} disabled={initial.flightTime === 0} />

      <SliderRow label={t("初速度", "Speed")} min={0} max={50} step={1} value={config.speed} unit="m/s" onChange={(v) => set("speed", v)} />
      <SliderRow label={t("仰角", "Angle")} min={0} max={90} step={1} value={config.angleDeg} unit="°" onChange={(v) => set("angleDeg", v)} />
      <SliderRow label={t("初始高度", "Height")} min={0} max={30} step={0.5} value={config.launchHeight} unit="m" onChange={(v) => set("launchHeight", v)} />
      <SliderRow label={t("重力", "Gravity")} min={1} max={20} step={0.1} value={config.gravity} onChange={(v) => set("gravity", v)} />
      <SliderRow label={t("线性阻力", "Drag / m")} min={0} max={1.5} step={0.05} value={config.drag} unit="s⁻¹" onChange={(v) => set("drag", v)} />
      <SliderRow label={t("飞行进度", "Progress")} min={0} max={1} step={0.01} value={Number((playback.fraction ?? config.progress).toFixed(2))} onChange={(v) => set("progress", v)} />
      <label style={{ color: C.muted, fontSize: 12 }}><input type="checkbox" checked={config.showVelocity} onChange={(e) => set("showVelocity", e.target.checked)} />{t("显示速度分量", "Show velocity components")}</label>
    </>}
    explanation={config.drag === 0 ? t("无空气阻力时，水平速度不变，竖直加速度为 −g。同高度发射和落地时，45° 获得最大射程；从高处发射时这个结论不再直接成立。", "Without drag, horizontal velocity is constant and vertical acceleration is −g. The 45° maximum-range rule applies only when launch and landing heights match.") : t("这里使用 F阻 = −bv 的线性阻力模型，而非高速物体常用的平方阻力。阻力同时改变水平、竖直速度；虚线帮助区分参数改变造成的结果。", "This model uses linear drag F = −bv, rather than quadratic drag. Drag changes both velocity components; the dashed reference isolates its effect.")}>
    <CartesianPlot xMin={0} xMax={xmax} yMin={0} yMax={ymax} xLabel="x / m" yLabel="y / m" label={t("抛射轨迹与速度分量", "Projectile trajectory and velocity components")}>
      <path d={path(vacuum.trajectory)} stroke={C.muted} strokeWidth={2} strokeDasharray="5 6" fill="none" opacity={0.5} />
      <path d={path(r.trajectory)} stroke={C.accent} strokeWidth={3} fill="none" />
      {config.showVelocity ? <><path d={`M${p.x(r.current.x)},${p.y(r.current.y)}h${r.current.vx * vectorScale}`} stroke={C.series1} strokeWidth={3} /><path d={`M${p.x(r.current.x)},${p.y(r.current.y)}v${-r.current.vy * vectorScale}`} stroke={C.series2} strokeWidth={3} /></> : null}
      <circle cx={p.x(r.current.x)} cy={p.y(Math.max(0, r.current.y))} r={7} fill={C.series1} stroke={C.surface} strokeWidth={2} />
      <text x={p.x(r.current.x) + 10} y={Math.max(42, p.y(r.current.y) - 12)} fontSize={12} fill={C.ink}>vₓ={r.current.vx.toFixed(1)} · vᵧ={r.current.vy.toFixed(1)}</text>
    </CartesianPlot>
  </SceneFrame></div>;
}
