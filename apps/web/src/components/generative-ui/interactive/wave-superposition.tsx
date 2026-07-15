"use client";

import { useEffect, useState } from "react";
import { describeSuperposition, sampleWave, type WaveSuperpositionConfig } from "@/lib/interactive/components/wave-superposition";
import { WIDGET_COLORS } from "./palette";
import { Readout, SliderRow } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

const W = 680;
const H = 270;
// Pixels per unit amplitude, scaled so the largest possible resultant
// (amplitude1 + amplitude2) always stays inside the viewBox.
function amplitudeScale(config: WaveSuperpositionConfig) {
  return (H / 2 - 14) / Math.max(2, config.amplitude1 + config.amplitude2);
}
function wavePath(config: WaveSuperpositionConfig, time: number, key: "wave1" | "wave2" | "resultant") {
  const scale = amplitudeScale(config);
  const points: string[] = [];
  for (let index = 0; index <= 120; index += 1) {
    const xWorld = index / 120 * 2;
    const value = sampleWave(config, xWorld, time)[key];
    points.push(`${index === 0 ? "M" : "L"}${(index / 120 * W).toFixed(1)},${(H / 2 - value * scale).toFixed(1)}`);
  }
  return points.join(" ");
}

export function WaveSuperpositionWidget({ config, onChange }: { config: WaveSuperpositionConfig; onChange: (next: WaveSuperpositionConfig) => void }) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      setTime((now - start) / 1800);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  const summary = describeSuperposition(config);
  const set = <K extends keyof WaveSuperpositionConfig>(key: K, value: WaveSuperpositionConfig[K]) => onChange({ ...config, [key]: value });
  return (
    <WidgetShell componentId="physics.wave-superposition" title="波的叠加 · 动态观察">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="两列简谐波和合成波" style={{ display: "block", width: "100%" }}>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={WIDGET_COLORS.line} />
        {config.showComponents ? <><path d={wavePath(config, time, "wave1")} fill="none" stroke={WIDGET_COLORS.series1} strokeWidth="1.6" opacity="0.75" /><path d={wavePath(config, time, "wave2")} fill="none" stroke={WIDGET_COLORS.series3} strokeWidth="1.6" opacity="0.75" /></> : null}
        <path d={wavePath(config, time, "resultant")} fill="none" stroke={WIDGET_COLORS.series2} strokeWidth="3" />
      </svg>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "9px 14px 3px" }}>
        <button type="button" onClick={() => setPlaying((value) => !value)} style={{ border: 0, borderRadius: 7, padding: "6px 12px", background: WIDGET_COLORS.accent, color: WIDGET_COLORS.surface, cursor: "pointer" }}>{playing ? "暂停" : "播放"}</button>
        <Readout label="叠加关系" value={summary.relation === "constructive" ? "相长" : summary.relation === "destructive" ? "相消" : "混合"} tone={summary.relation !== "mixed" ? "accent" : "default"} />
        <Readout label="拍频" value={`${summary.beatFrequency.toFixed(2)} Hz`} />
        <label style={{ color: WIDGET_COLORS.muted, fontSize: 11.5 }}><input type="checkbox" checked={config.showComponents} onChange={(event) => set("showComponents", event.target.checked)} /> 显示分波</label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: "9px 22px", padding: 14 }}>
        <SliderRow label="振幅 A₁" min={0.2} max={2} step={0.1} value={config.amplitude1} onChange={(value) => set("amplitude1", value)} />
        <SliderRow label="振幅 A₂" min={0.2} max={2} step={0.1} value={config.amplitude2} onChange={(value) => set("amplitude2", value)} />
        <SliderRow label="频率 f₁" min={0.5} max={3} step={0.1} value={config.frequency1} unit=" Hz" onChange={(value) => set("frequency1", value)} />
        <SliderRow label="频率 f₂" min={0.5} max={3} step={0.1} value={config.frequency2} unit=" Hz" onChange={(value) => set("frequency2", value)} />
        <SliderRow label="相位差" min={0} max={360} step={5} value={config.phaseDiffDeg} unit="°" onChange={(value) => set("phaseDiffDeg", value)} />
      </div>
    </WidgetShell>
  );
}
