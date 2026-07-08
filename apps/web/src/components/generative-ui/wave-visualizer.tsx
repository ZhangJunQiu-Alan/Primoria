"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { WaveVisualizationArtifact, WaveComponent } from "@/lib/agent-os";
import { LO_CANVAS, LO_INK, LO_MUTED, SERIES, SERIES_STROKES } from "./style-tokens";

const PALETTE = [...SERIES_STROKES];
const C_BG = LO_CANVAS;
const C_TEXT = LO_INK;
const C_MUTED = LO_MUTED;
const C_ZERO = "rgba(41,36,28,0.22)";
const C_SUM = LO_INK;
const C_ENVELOPE = "rgba(166,111,16,0.45)";
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, monospace";

type LocalWave = WaveComponent & { localAmplitude: number; localFrequency: number };

function waveColor(wave: LocalWave, index: number): string {
  return wave.color ?? PALETTE[index % PALETTE.length] ?? SERIES.amber.stroke;
}

function evalWaveAt(wave: LocalWave, t: number): number {
  const A = wave.localAmplitude;
  const theta = 2 * Math.PI * wave.localFrequency * t + (wave.phase ?? 0);
  const norm = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  switch (wave.kind ?? "sine") {
    case "sine":     return A * Math.sin(theta);
    case "square":   return A * (norm < Math.PI ? 1 : -1);
    case "sawtooth": return A * (norm / Math.PI - 1);
    case "triangle": return A * (norm < Math.PI ? 2 * norm / Math.PI - 1 : 3 - 2 * norm / Math.PI);
    default:         return A * Math.sin(theta);
  }
}

function drawZeroLine(
  ctx: CanvasRenderingContext2D,
  x0: number, midY: number, w: number,
): void {
  ctx.strokeStyle = C_ZERO;
  ctx.lineWidth = 0.75;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x0, midY);
  ctx.lineTo(x0 + w, midY);
  ctx.stroke();
}

function drawWaveCurve(
  ctx: CanvasRenderingContext2D,
  waves: LocalWave[],
  indices: number[],
  x0: number, midY: number, w: number, scaleY: number,
  tVirtual: number, tWindow: number,
  color: string, lineWidth: number,
  steps: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);
  ctx.beginPath();
  let first = true;
  for (let i = 0; i <= steps; i++) {
    const t = tVirtual - tWindow + (i / steps) * tWindow;
    let y = 0;
    for (const idx of indices) y += evalWaveAt(waves[idx]!, t);
    const xPix = x0 + (i / steps) * w;
    const yPix = midY - y * scaleY;
    if (first) { ctx.moveTo(xPix, yPix); first = false; }
    else ctx.lineTo(xPix, yPix);
  }
  ctx.stroke();
}

function formatDuration(s: number): string {
  if (s < 0.001) return `${(s * 1e6).toFixed(0)}µs`;
  if (s < 1) return `${(s * 1000).toFixed(1)}ms`;
  return `${s.toFixed(2)}s`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function WaveVisualizer({ artifact }: { artifact: WaveVisualizationArtifact }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscsRef = useRef<OscillatorNode[]>([]);
  const gainsRef = useRef<GainNode[]>([]);

  const [playing, setPlaying] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [localWaves, setLocalWaves] = useState<LocalWave[]>(() =>
    artifact.waves.map(w => ({ ...w, localAmplitude: w.amplitude, localFrequency: w.frequency })),
  );

  const fMin = Math.max(0.001, Math.min(...localWaves.map(w => w.localFrequency)));
  const fMax = Math.max(...localWaves.map(w => w.localFrequency));

  const tWindow: number = (() => {
    if (artifact.layout === "beat" && localWaves.length >= 2) {
      const df = Math.abs(localWaves[0]!.localFrequency - localWaves[1]!.localFrequency);
      if (df > 1e-6) return Math.max(3 / df, (artifact.timeScale ?? 3) / fMin);
    }
    return (artifact.timeScale ?? 3) / fMin;
  })();

  // ── Draw ─────────────────────────────────────────────────────────────────────

  const draw = useCallback((tVirtual: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx || W === 0 || H === 0) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, W, H);

    const layout = artifact.layout;
    const PAD = { l: 10, r: 10, t: 10, b: 20 };
    const plotW = W - PAD.l - PAD.r;
    const waves = localWaves;
    const steps = Math.min(2000, Math.max(Math.ceil(plotW * 1.5), Math.ceil(6 * fMax * tWindow)));

    if (layout === "superposition") {
      const N = waves.length;
      const totalH = H - PAD.t - PAD.b;
      const sumH = Math.round(totalH * 0.38);
      const stripH = Math.round((totalH - sumH - 8) / N);

      for (let i = 0; i < N; i++) {
        const y0 = PAD.t + i * (stripH + 4);
        const midY = y0 + stripH / 2;
        const scaleY = stripH * 0.42;
        const color = waveColor(waves[i]!, i);
        drawZeroLine(ctx, PAD.l, midY, plotW);
        drawWaveCurve(ctx, waves, [i], PAD.l, midY, plotW, scaleY, tVirtual, tWindow, color, 1.5, steps);
        ctx.fillStyle = color;
        ctx.font = `9px ${FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(waves[i]!.label ?? `w${i + 1}`, PAD.l + 3, y0 + 2);
      }

      const sepY = PAD.t + N * (stripH + 4) + 2;
      ctx.strokeStyle = "rgba(213,201,184,0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(PAD.l, sepY);
      ctx.lineTo(PAD.l + plotW, sepY);
      ctx.stroke();
      ctx.setLineDash([]);

      const sumY0 = sepY + 4;
      const sumMidY = sumY0 + sumH / 2;
      const sumScaleY = sumH * 0.42;
      drawZeroLine(ctx, PAD.l, sumMidY, plotW);
      drawWaveCurve(ctx, waves, waves.map((_, i) => i), PAD.l, sumMidY, plotW, sumScaleY, tVirtual, tWindow, C_SUM, 2, steps);
      ctx.fillStyle = C_MUTED;
      ctx.font = `9px ${FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("sum", PAD.l + 3, sumY0 + 2);

      // time axis
      ctx.fillStyle = C_MUTED;
      ctx.font = `9px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (let i = 0; i <= 4; i++) {
        ctx.fillText(formatDuration((i / 4) * tWindow), PAD.l + (i / 4) * plotW, H - 1);
      }

    } else if (layout === "beat") {
      const plotH = H - PAD.t - PAD.b;
      const midY = PAD.t + plotH / 2;
      const scaleY = plotH * 0.42;

      drawZeroLine(ctx, PAD.l, midY, plotW);

      for (let i = 0; i < Math.min(waves.length, 2); i++) {
        drawWaveCurve(ctx, waves, [i], PAD.l, midY, plotW, scaleY, tVirtual, tWindow,
          waveColor(waves[i]!, i) + "70", 1.2, steps);
      }
      drawWaveCurve(ctx, waves, waves.map((_, i) => i), PAD.l, midY, plotW, scaleY, tVirtual, tWindow, C_SUM, 2.5, steps);

      if (waves.length >= 2) {
        const f1 = waves[0]!.localFrequency;
        const f2 = waves[1]!.localFrequency;
        const A1 = waves[0]!.localAmplitude;
        const A2 = waves[1]!.localAmplitude;
        const fBeat = Math.abs(f1 - f2);
        const envSteps = Math.ceil(plotW * 1.5);

        ctx.strokeStyle = C_ENVELOPE;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        for (const sign of [1, -1] as const) {
          ctx.beginPath();
          let first = true;
          for (let i = 0; i <= envSteps; i++) {
            const t = tVirtual - tWindow + (i / envSteps) * tWindow;
            const env = (A1 + A2) * Math.abs(Math.cos(Math.PI * fBeat * t));
            const xPix = PAD.l + (i / envSteps) * plotW;
            const yPix = midY - sign * env * scaleY;
            if (first) { ctx.moveTo(xPix, yPix); first = false; }
            else ctx.lineTo(xPix, yPix);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);

        if (fBeat > 1e-6) {
          const tBeat = 1 / fBeat;
          const xBeat = PAD.l + Math.min(tBeat / tWindow, 0.85) * plotW;
          const annoY = midY - scaleY * (A1 + A2) - 10;
          ctx.strokeStyle = "rgba(200,136,26,0.65)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD.l, annoY);
          ctx.lineTo(xBeat, annoY);
          ctx.stroke();
          ctx.fillStyle = SERIES.amber.stroke;
          ctx.font = `10px ${FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(`T_beat = ${formatDuration(tBeat)}`, PAD.l + (xBeat - PAD.l) / 2, annoY - 1);
        }
      }

      ctx.fillStyle = C_MUTED;
      ctx.font = `9px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (let i = 0; i <= 4; i++) {
        ctx.fillText(formatDuration((i / 4) * tWindow), PAD.l + (i / 4) * plotW, H - 1);
      }

    } else if (layout === "standing") {
      const plotH = H - PAD.t - PAD.b;
      const midY = PAD.t + plotH / 2;
      const scaleY = plotH * 0.42;
      const spatialSteps = Math.ceil(plotW * 2);

      drawZeroLine(ctx, PAD.l, midY, plotW);

      // ghost traces at earlier phases
      for (const phaseFrac of [0.15, 0.3, 0.5, 0.65, 0.8]) {
        const tGhost = tVirtual - phaseFrac / fMin;
        ctx.strokeStyle = "rgba(58,53,45,0.07)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= spatialSteps; i++) {
          const x = i / spatialSteps;
          let y = 0;
          for (const wave of waves) {
            const n = Math.max(1, Math.round(wave.localFrequency / fMin));
            y += wave.localAmplitude * Math.sin(n * Math.PI * x) *
                 Math.cos(2 * Math.PI * wave.localFrequency * tGhost + (wave.phase ?? 0));
          }
          const xPix = PAD.l + x * plotW;
          const yPix = midY - y * scaleY;
          if (first) { ctx.moveTo(xPix, yPix); first = false; }
          else ctx.lineTo(xPix, yPix);
        }
        ctx.stroke();
      }

      // current snapshot
      ctx.strokeStyle = C_SUM;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let firstMain = true;
      for (let i = 0; i <= spatialSteps; i++) {
        const x = i / spatialSteps;
        let y = 0;
        for (const wave of waves) {
          const n = Math.max(1, Math.round(wave.localFrequency / fMin));
          y += wave.localAmplitude * Math.sin(n * Math.PI * x) *
               Math.cos(2 * Math.PI * wave.localFrequency * tVirtual + (wave.phase ?? 0));
        }
        const xPix = PAD.l + x * plotW;
        const yPix = midY - y * scaleY;
        if (firstMain) { ctx.moveTo(xPix, yPix); firstMain = false; }
        else ctx.lineTo(xPix, yPix);
      }
      ctx.stroke();

      // node/antinode labels for single-mode case
      const allSameHarmonic = waves.every(
        w => Math.round(w.localFrequency / fMin) === Math.round(waves[0]!.localFrequency / fMin),
      );
      if (allSameHarmonic && waves.length > 0) {
        const n = Math.max(1, Math.round(waves[0]!.localFrequency / fMin));
        ctx.font = `9px ${FONT}`;
        ctx.textAlign = "center";
        for (let k = 0; k <= n; k++) {
          const xPix = PAD.l + (k / n) * plotW;
          ctx.fillStyle = SERIES.sage.stroke;
          ctx.textBaseline = "top";
          ctx.fillText("N", xPix, midY + scaleY + 3);
        }
        for (let k = 0; k < n; k++) {
          const xPix = PAD.l + ((2 * k + 1) / (2 * n)) * plotW;
          ctx.fillStyle = SERIES.amber.stroke;
          ctx.textBaseline = "bottom";
          ctx.fillText("A", xPix, midY - scaleY - 3);
        }
      }

      // position axis
      ctx.fillStyle = C_MUTED;
      ctx.font = `9px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (let i = 0; i <= 4; i++) {
        ctx.fillText(`${i * 25}%λ`, PAD.l + (i / 4) * plotW, H - 1);
      }
    }
  }, [artifact.layout, localWaves, fMin, fMax, tWindow]);

  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // ── Animation loop ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    function frame(ts: number) {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;
      tRef.current += dt * speed;
      drawRef.current(tRef.current);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed]);

  useEffect(() => {
    if (!playing) drawRef.current(tRef.current);
  }, [playing, localWaves]);

  // ── Canvas resize ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      if (!w) return;
      const N = artifact.waves.length;
      const h = artifact.layout === "superposition"
        ? Math.max(180, N * 58 + 100)
        : 200;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      drawRef.current(tRef.current);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [artifact.layout, artifact.waves.length]);

  // ── Audio ─────────────────────────────────────────────────────────────────────

  const startAudio = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    ctx.resume();
    oscsRef.current.forEach(o => { try { o.stop(); } catch { /**/ } });
    oscsRef.current = [];
    gainsRef.current = [];
    for (let i = 0; i < localWaves.length; i++) {
      const wave = localWaves[i]!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = (wave.kind ?? "sine") as OscillatorType;
      osc.frequency.value = artifact.audioFrequencies?.[i] ?? wave.localFrequency;
      gain.gain.value = wave.localAmplitude * 0.25;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscsRef.current.push(osc);
      gainsRef.current.push(gain);
    }
  }, [localWaves, artifact.audioFrequencies]);

  const stopAudio = useCallback(() => {
    oscsRef.current.forEach(o => { try { o.stop(); } catch { /**/ } });
    oscsRef.current = [];
    gainsRef.current = [];
  }, []);

  useEffect(() => {
    if (oscsRef.current.length === 0) return;
    for (let i = 0; i < Math.min(localWaves.length, oscsRef.current.length); i++) {
      const osc = oscsRef.current[i];
      const gain = gainsRef.current[i];
      if (osc) osc.frequency.value = artifact.audioFrequencies?.[i] ?? localWaves[i]!.localFrequency;
      if (gain) gain.gain.value = localWaves[i]!.localAmplitude * 0.25;
    }
  }, [localWaves, artifact.audioFrequencies]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    stopAudio();
    audioCtxRef.current?.close();
  }, [stopAudio]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const BTN: CSSProperties = {
    padding: "4px 10px",
    fontSize: 12,
    borderRadius: 8,
    border: "1px solid #d5c9b8",
    background: C_BG,
    color: C_TEXT,
    cursor: "pointer",
    fontFamily: FONT,
    lineHeight: "1.5",
  };

  return (
    <div className="message-row tool">
      <div className="tool-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>{artifact.title}</span>
        </div>
        <div className="visualizer" style={{ padding: "12px 16px" }}>
          <strong style={{ display: "block", marginBottom: 4, color: C_TEXT, fontSize: 14 }}>
            {artifact.title}
          </strong>
          <p style={{ margin: "0 0 12px", color: C_MUTED, fontSize: 13, lineHeight: 1.4 }}>
            {artifact.description}
          </p>

          <div ref={containerRef} style={{ width: "100%" }}>
            <canvas
              ref={canvasRef}
              style={{ display: "block", width: "100%", borderRadius: 10, background: C_BG }}
            />
          </div>

          {/* Per-wave sliders */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {localWaves.map((w, i) => {
              const color = waveColor(w, i);
              const fOrig = artifact.waves[i]!.frequency;
              const fAudio = artifact.audioFrequencies?.[i];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                    background: color, border: "1.5px solid rgba(0,0,0,0.12)",
                    display: "inline-block",
                  }} />
                  <span style={{ fontSize: 12, color: C_TEXT, minWidth: 28, fontFamily: MONO }}>
                    {w.label ?? `w${i + 1}`}
                  </span>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, flex: "1 1 90px" }}>
                    <span style={{ fontSize: 11, color: C_MUTED }}>A</span>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={w.localAmplitude}
                      onChange={e => setLocalWaves(prev =>
                        prev.map((pw, pi) => pi === i ? { ...pw, localAmplitude: parseFloat(e.target.value) } : pw),
                      )}
                      style={{ flex: 1, accentColor: SERIES.amber.stroke }}
                    />
                    <span style={{ fontSize: 11, color: C_MUTED, minWidth: 28, fontFamily: MONO, textAlign: "right" }}>
                      {w.localAmplitude.toFixed(2)}
                    </span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, flex: "1 1 120px" }}>
                    <span style={{ fontSize: 11, color: C_MUTED }}>f</span>
                    <input
                      type="range"
                      min={Math.max(0.001, fOrig * 0.25)}
                      max={fOrig * 4}
                      step={Math.max(0.001, fOrig * 0.005)}
                      value={w.localFrequency}
                      onChange={e => setLocalWaves(prev =>
                        prev.map((pw, pi) => pi === i ? { ...pw, localFrequency: parseFloat(e.target.value) } : pw),
                      )}
                      style={{ flex: 1, accentColor: SERIES.amber.stroke }}
                    />
                    <span style={{ fontSize: 11, color: C_MUTED, minWidth: 40, fontFamily: MONO, textAlign: "right" }}>
                      {w.localFrequency.toFixed(2)}Hz
                      {fAudio != null ? <span style={{ fontSize: 9, display: "block", color: C_MUTED }}>({fAudio}Hz)</span> : null}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                if (!playing) {
                  if (artifact.audioEnabled && audioOn) startAudio();
                  setPlaying(true);
                } else {
                  stopAudio();
                  setPlaying(false);
                }
              }}
              style={{ ...BTN, minWidth: 68, background: playing ? SERIES.amber.fill : C_BG, borderColor: playing ? SERIES.amber.stroke : "#d5c9b8" }}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => { tRef.current = 0; if (!playing) drawRef.current(0); }}
              style={BTN}
            >
              Reset
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: C_MUTED, fontFamily: FONT }}>Speed</span>
              <input
                type="range" min={0.25} max={4} step={0.25} value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{ width: 56, accentColor: SERIES.amber.stroke }}
              />
              <span style={{ fontSize: 10, color: C_MUTED, fontFamily: FONT }}>{speed}x</span>
            </div>
            {artifact.audioEnabled && (
              <button
                onClick={() => {
                  const next = !audioOn;
                  setAudioOn(next);
                  if (!next) stopAudio();
                  else if (playing) startAudio();
                }}
                style={{ ...BTN, marginLeft: "auto", background: audioOn ? SERIES.amber.fill : C_BG, borderColor: audioOn ? SERIES.amber.stroke : "#d5c9b8" }}
              >
                {audioOn ? "Audio on" : "Audio off"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
