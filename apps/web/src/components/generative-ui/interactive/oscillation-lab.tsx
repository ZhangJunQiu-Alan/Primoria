"use client";

import { useRef } from "react";

import { computeOscillation, type OscillationLabConfig } from "@/lib/interactive/components/oscillation-lab";
import { ScenePlaybackControls, useScenePlayback } from "./primitives/scene-playback";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function OscillationLabWidget({ config, onChange }: { config: OscillationLabConfig; onChange: (next: OscillationLabConfig) => void }) {
  const t = useSceneLocale();
  const sceneRef = useRef<HTMLDivElement>(null);
  const initial = computeOscillation(config);
  const playback = useScenePlayback(sceneRef, 20);
  const r = playback.fraction === null ? initial : computeOscillation({ ...config, elapsedSeconds: playback.fraction * 20 });
  const set = <K extends keyof OscillationLabConfig>(key: K, value: OscillationLabConfig[K]) => { playback.reset(); onChange({ ...config, [key]: value }); };
  const pendulum = config.system === "pendulum";
  const bobX = 235 + Math.sin(r.angle) * 170, bobY = 35 + Math.cos(r.angle) * 170;
  const massX = 235 + r.displacement / Math.max(config.amplitudeM, 0.02) * 100;
  const coils = Array.from({ length: 21 }, (_, i) => `${i ? "L" : "M"}${64 + i / 20 * (massX - 92)},${145 + (i === 0 || i === 20 ? 0 : i % 2 ? 12 : -12)}`).join("");
  return <div ref={sceneRef}><SceneFrame id="physics.oscillation-lab" title={t("运动停下来，能量去哪了？", "Where is the energy at a turning point?")} description={t("拖动时间观察动能与势能交换，再改变质量和尺度，区分周期的影响因素。", "Scrub time to see kinetic and potential energy exchange, then change mass and scale to investigate the period.")}
    readouts={[{ label: t("周期", "Period"), value: r.period.toFixed(3), unit: "s" }, { label: t("位移", "Displacement"), value: r.displacement.toFixed(3), unit: "m" }, { label: t("速率", "Speed"), value: Math.abs(r.velocity).toFixed(3), unit: "m/s" }, { label: t("总机械能", "Total energy"), value: (r.potential + r.kinetic).toFixed(4), unit: "J" }]}
    controls={<>
      <ScenePlaybackControls playback={playback} initialFraction={config.elapsedSeconds / 20} />

      <SegmentedControl label={t("系统", "System")} value={config.system} options={[["spring", t("弹簧振子", "Spring")], ["pendulum", t("单摆", "Pendulum")]]} onChange={(v) => set("system", v)} />
      <SliderRow label={t("质量", "Mass")} min={0.1} max={5} step={0.1} value={config.massKg} unit="kg" onChange={(v) => set("massKg", v)} />
      {pendulum ? <><SliderRow label={t("摆长", "Length")} min={0.2} max={3} step={0.1} value={config.lengthM} unit="m" onChange={(v) => set("lengthM", v)} /><SliderRow label={t("角振幅", "Amplitude")} min={1} max={30} step={1} value={config.angleDeg} unit="°" onChange={(v) => set("angleDeg", v)} /></> : <><SliderRow label="k" min={1} max={80} step={1} value={config.stiffness} unit="N/m" onChange={(v) => set("stiffness", v)} /><SliderRow label={t("振幅", "Amplitude")} min={0.02} max={1} step={0.01} value={config.amplitudeM} unit="m" onChange={(v) => set("amplitudeM", v)} /></>}
      <SliderRow label={t("时间", "Time")} min={0} max={20} step={0.01} value={Number((playback.fraction === null ? config.elapsedSeconds : playback.fraction * 20).toFixed(2))} unit="s" onChange={(v) => set("elapsedSeconds", v)} />
    </>}
    explanation={pendulum ? t("单摆满足 θ″ = −(g/L)sin θ。周期与质量无关，较大振幅会使周期略长于小角度近似。图中横向位移是 Lsinθ，速率是沿圆弧的 L|θ′|；忽略阻力。", "The pendulum follows θ″ = −(g/L)sin θ. Period is independent of mass and increases slightly with amplitude. Horizontal displacement is Lsinθ; speed along the arc is L|θ′|. Drag is omitted.") : t("弹簧周期 T = 2π√(m/k)。端点速度为零而势能最大，经过平衡位置时动能最大；无阻尼时两者之和保持不变。弹簧图的伸缩比例用于示意。", "For a spring, T = 2π√(m/k). Turning points have zero speed and maximum potential energy; equilibrium has maximum kinetic energy. Without damping the sum stays constant. Spring dimensions are schematic.")}>
    <svg viewBox="0 0 680 290" role="img" aria-label={t("振动位置与动势能条形图", "Oscillator position and energy bars")} style={{ width: "100%", display: "block" }}>
      {pendulum ? <><path d="M150,193A170,170 0 0 0 320,193" fill="none" stroke={C.line} strokeDasharray="4 5" /><line x1={235} y1={35} x2={bobX} y2={bobY} stroke={C.muted} strokeWidth={2} /><circle cx={235} cy={35} r={5} fill={C.ink} /><circle cx={bobX} cy={bobY} r={17} fill={C.series2} /></> : <><line x1={64} x2={64} y1={100} y2={200} stroke={C.muted} strokeWidth={5} /><path d={coils} stroke={C.accent} strokeWidth={2.5} fill="none" /><rect x={massX - 28} y={118} width={56} height={54} rx={8} fill={C.series2} /><line x1={235} x2={235} y1={90} y2={215} stroke={C.line} strokeDasharray="4 4" /><line x1={64} x2={390} y1={174} y2={174} stroke={C.line} /></>}
      {[{ label: t("动能", "Kinetic"), energy: r.kinetic, tone: C.series1 }, { label: t("势能", "Potential"), energy: r.potential, tone: C.accent }].map((bar, i) => <g key={bar.label}><rect x={441 + i * 103} y={55} width={42} height={150} rx={5} fill={C.surfaceSoft} /><rect x={441 + i * 103} y={205 - 150 * Math.max(0, Math.min(1, bar.energy / r.totalEnergy))} width={42} height={150 * Math.max(0, Math.min(1, bar.energy / r.totalEnergy))} rx={5} fill={bar.tone} /><text x={462 + i * 103} y={231} fill={C.muted} fontSize={12} textAnchor="middle">{bar.label}</text><text x={462 + i * 103} y={262} fill={C.ink} fontSize={12} textAnchor="middle">{bar.energy.toFixed(3)} J</text></g>)}
    </svg>
  </SceneFrame></div>;
}
