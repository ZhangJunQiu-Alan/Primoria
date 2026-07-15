"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeRhythmPattern, type RhythmPatternConfig } from "@/lib/interactive/components/rhythm-pattern";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl, SliderRow } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

const NEXT_STEP = { accent: "hit", hit: "rest", rest: "accent" } as const;
export function RhythmPatternWidget({ config, onChange }: { config: RhythmPatternConfig; onChange: (next: RhythmPatternConfig) => void }) {
  const analysis = analyzeRhythmPattern(config);
  const [playhead, setPlayhead] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const stop = () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; setPlayhead(-1); void audioRef.current?.close(); audioRef.current = null; };
  useEffect(() => stop, []);
  const play = () => {
    stop();
    const AudioContextClass = window.AudioContext;
    const audio = new AudioContextClass();
    audioRef.current = audio;
    config.steps.forEach((step, index) => { if (step === "rest") return; const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.frequency.value = step === "accent" ? 880 : 560; gain.gain.setValueAtTime(step === "accent" ? 0.16 : 0.09, audio.currentTime + index * analysis.stepDurationSeconds); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + index * analysis.stepDurationSeconds + 0.08); oscillator.connect(gain).connect(audio.destination); oscillator.start(audio.currentTime + index * analysis.stepDurationSeconds); oscillator.stop(audio.currentTime + index * analysis.stepDurationSeconds + 0.09); });
    let index = 0; setPlayhead(0); timerRef.current = setInterval(() => { index += 1; if (index >= config.steps.length) { stop(); return; } setPlayhead(index); }, analysis.stepDurationSeconds * 1000);
  };
  return (
    <WidgetShell componentId="music.rhythm-pattern" title="节奏型 · 构建与播放">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(42px,1fr))", gap: 7, padding: 18 }}>{config.steps.map((step, index) => <button key={index} type="button" onClick={() => onChange({ ...config, steps: config.steps.map((item, itemIndex) => itemIndex === index ? NEXT_STEP[item] : item) })} style={{ minHeight: step === "accent" ? 92 : step === "hit" ? 70 : 50, alignSelf: "end", border: `2px solid ${playhead === index ? WIDGET_COLORS.series1 : WIDGET_COLORS.line}`, borderLeftWidth: index % analysis.stepsPerMeasure === 0 ? 5 : 2, borderLeftColor: index % analysis.stepsPerMeasure === 0 ? WIDGET_COLORS.series3 : playhead === index ? WIDGET_COLORS.series1 : WIDGET_COLORS.line, borderRadius: 8, background: step === "accent" ? WIDGET_COLORS.accent : step === "hit" ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surfaceSoft, color: step === "accent" ? WIDGET_COLORS.surface : WIDGET_COLORS.muted, cursor: "pointer", fontSize: 11, fontWeight: 650 }}>{step === "accent" ? "重音" : step === "hit" ? "击拍" : "休止"}<small style={{ display: "block", marginTop: 5 }}>{index + 1}</small></button>)}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "0 14px 10px" }}><button type="button" onClick={play} style={{ border: 0, borderRadius: 7, padding: "6px 13px", background: WIDGET_COLORS.accent, color: WIDGET_COLORS.surface, cursor: "pointer" }}>播放</button><button type="button" onClick={stop}>停止</button><Readout label="每小节" value={`${analysis.stepsPerMeasure} 步`} /><Readout label="时长" value={`${analysis.totalDurationSeconds.toFixed(2)}s`} /><Readout label="发声步" value={analysis.soundedSteps} /></div>
      <div style={{ display: "grid", gap: 10, padding: "0 14px 14px" }}><SegmentedControl label="拍号" value={config.timeSignature} options={[["2/4", "2/4"], ["3/4", "3/4"], ["4/4", "4/4"], ["6/8", "6/8"]]} onChange={(timeSignature) => onChange({ ...config, timeSignature })} /><SegmentedControl label="细分" value={config.subdivision} options={[["quarter", "四分"], ["eighth", "八分"], ["sixteenth", "十六分"]]} onChange={(subdivision) => onChange({ ...config, subdivision })} /><SliderRow label="速度" min={40} max={200} step={1} value={config.tempoBpm} unit=" BPM" onChange={(tempoBpm) => onChange({ ...config, tempoBpm })} /></div>
    </WidgetShell>
  );
}
