"use client";

import { computeMagneticMotion, type MagneticMotionConfig } from "@/lib/interactive/components/magnetic-motion";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function MagneticMotionWidget({ config, onChange }: { config: MagneticMotionConfig; onChange: (next: MagneticMotionConfig) => void }) {
  const t = useSceneLocale(), r = computeMagneticMotion(config);
  const set = <K extends keyof MagneticMotionConfig>(key: K, value: MagneticMotionConfig[K]) => onChange({ ...config, [key]: value });
  const helix = config.view === "helix";
  const scale = 90 / Math.max(r.radius, 1e-15), advance = helix ? 250 / Math.max(r.pitch * 3, r.radius * 8, 1e-15) : 0;
  const project = (s: { x: number; y: number; z: number }) => ({ x: (helix ? 130 : 300) + s.x * scale + s.z * advance, y: 160 - (r.radius > 1e-15 ? r.sign * 90 * (helix ? 0.55 : 1) : 0) - s.y * scale * (helix ? 0.55 : 1) - (helix ? s.z * advance * 0.15 : 0) });
  const current = project(r.current);
  const path = Array.from({ length: 241 }, (_, i) => { const p = project(r.stateAtTurns(i / 80)); return `${i ? "L" : "M"}${p.x},${p.y}`; }).join("");
  const velocityX = r.current.vx * scale + r.current.vz * advance;
  const velocityY = -r.current.vy * scale * (helix ? 0.55 : 1) - (helix ? r.current.vz * advance * 0.15 : 0);
  const velocityScale = 35 / Math.max(1e-12, Math.hypot(velocityX, velocityY));
  return <SceneFrame id="physics.magnetic-motion" title={t("磁场让速度转弯，但不改变速率", "Magnetic fields turn velocity without changing speed")} description={t("B 指向 +z，初始横向速度指向 +x。旋向由电荷符号决定，平行分量保持不变。螺旋视图纵横缩放为示意。", "B points along +z and initial transverse velocity along +x. Charge sign determines turning direction; parallel velocity stays constant. The helix view uses schematic scaling.")}
    readouts={[{ label: t("回旋半径", "Cyclotron radius"), value: r.radius.toExponential(3), unit: "m" }, { label: t("回旋周期", "Cyclotron period"), value: r.period.toExponential(3), unit: "s" }, { label: t("螺距", "Helix pitch"), value: r.pitch.toExponential(3), unit: "m" }, { label: t("速率", "Speed"), value: (Math.hypot(r.current.vx, r.current.vy, r.current.vz) / 1e6).toFixed(3), unit: "×10⁶m/s" }]}
    controls={<><SegmentedControl label={t("粒子", "Particle")} value={config.particle} options={[["electron", t("电子", "Electron")], ["proton", t("质子", "Proton")]]} onChange={(v) => set("particle", v)} /><SliderRow label="B" min={0.1} max={10} step={0.1} value={config.fieldMT} unit="mT" onChange={(v) => set("fieldMT", v)} /><SliderRow label={t("初始速率", "Initial speed")} min={0.1} max={10} step={0.1} value={config.speedMillion} unit="×10⁶" onChange={(v) => set("speedMillion", v)} /><SliderRow label={t("与B夹角", "Angle to B")} min={0} max={90} step={1} value={config.pitchDeg} unit="°" onChange={(v) => set("pitchDeg", v)} /><SliderRow label={t("周期进度", "Elapsed periods")} min={0} max={3} step={0.01} value={config.turns} onChange={(v) => set("turns", v)} /><SegmentedControl label={t("视图", "View")} value={config.view} options={[["transverse", t("垂直截面", "Transverse")], ["helix", t("空间轨迹", "Helix")]]} onChange={(v) => set("view", v)} /><label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showVelocity} onChange={(e) => set("showVelocity", e.target.checked)} />{t("显示速度方向", "Show velocity direction")}</label></>}
    explanation={config.pitchDeg === 0 ? t("v与B平行，v×B=0，因此沿磁场方向做匀速直线运动。横截面只看到一个点；回旋周期是运动方程的特征时间，并非真的在转圈。", "When v is parallel to B, v×B=0 and motion is a straight line. The transverse view shows one point; the listed period is a characteristic time, not an actual orbit.") : t("r=mv⊥/(|q|B)，T=2πm/(|q|B)，螺距=v∥T。洛伦兹力始终垂直速度，所以不做功。忽略相对论、电场、辐射与边界效应；切换电子/质子也会改变质量。", "r=mv⊥/(|q|B), T=2πm/(|q|B), pitch=v∥T. The Lorentz force is perpendicular to velocity and does no work. Relativity, electric fields, radiation and boundaries are omitted. Switching electron/proton changes mass as well as sign.")}>
    <svg viewBox="0 0 680 340" role="img" aria-label={t("带电粒子轨迹与匀强磁场", "Charged-particle trajectory in a uniform magnetic field")} style={{ width: "100%", display: "block" }}>
      {Array.from({ length: 35 }, (_, i) => <g key={i} opacity={0.28}><circle cx={70 + i % 7 * 80} cy={40 + Math.floor(i / 7) * 60} r={6} fill="none" stroke={C.muted} /><circle cx={70 + i % 7 * 80} cy={40 + Math.floor(i / 7) * 60} r={1.5} fill={C.muted} /></g>)}
      <path d={path} fill="none" stroke={C.series2} strokeWidth={2.5} /><circle cx={current.x} cy={current.y} r={7} fill={C.series1} stroke={C.surface} strokeWidth={2} />
      {config.showVelocity && Math.hypot(velocityX, velocityY) > 1e-9 ? <path d={`M${current.x},${current.y}l${velocityX * velocityScale},${velocityY * velocityScale}`} stroke={C.accent} strokeWidth={3} /> : null}
      <text x={640} y={42} textAnchor="end" fill={C.muted} fontSize={13}>B: +z ⊙</text><text x={640} y={308} textAnchor="end" fill={C.muted} fontSize={12}>{t("轨迹与箭头按示意比例", "Trajectory and arrows schematic")}</text>
    </svg>
  </SceneFrame>;
}
