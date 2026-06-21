"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MathExplorerArtifact, MathExplorerParameter } from "@/lib/agent-os";

type MathCompiled = { evaluate(scope?: Record<string, number>): unknown };
type MathInstance = { compile(expr: string): MathCompiled };

let mathjsPromise: Promise<MathInstance> | null = null;
function getMathjs(): Promise<MathInstance> {
  if (!mathjsPromise) mathjsPromise = import("mathjs") as Promise<MathInstance>;
  return mathjsPromise;
}

const PALETTE = ["#c8881a", "#4a7a5a", "#7c6ad0", "#b56474"];
const N = 500;

function niceGridStep(span: number): number {
  const raw = span / 8;
  const exp = Math.floor(Math.log10(Math.max(Math.abs(raw), 1e-10)));
  const mag = Math.pow(10, exp);
  const norm = raw / mag;
  if (norm < 1.5) return mag;
  if (norm < 3.5) return 2 * mag;
  if (norm < 7.5) return 5 * mag;
  return 10 * mag;
}

function formatTick(v: number): string {
  if (Math.abs(v) < 1e-9) return "0";
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return parseFloat(v.toFixed(2)).toString();
}

function initParamValues(parameters: MathExplorerParameter[]): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const p of parameters) vals[p.name] = p.default;
  return vals;
}

export function MathExplorerRenderer({ artifact }: { artifact: MathExplorerArtifact }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mathRef = useRef<MathInstance | null>(null);
  const [paramValues, setParamValues] = useState(() => initParamValues(artifact.parameters));
  const [mathLoadError, setMathLoadError] = useState(false);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const math = mathRef.current;
    if (!canvas || !math || canvas.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    if (W === 0 || H === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const PAD = { top: 20, right: 16, bottom: 32, left: 48 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const mode = artifact.mode ?? "cartesian";
    const scope: Record<string, number> = { ...paramValues, pi: Math.PI, e: Math.E };

    const xRange: [number, number] = artifact.xRange ?? [-6.3, 6.3];
    const tRange: [number, number] = artifact.tRange ?? [0, 2 * Math.PI];

    let yMin = artifact.yRange?.[0];
    let yMax = artifact.yRange?.[1];

    if (yMin === undefined || yMax === undefined) {
      const samples: number[] = [];
      try {
        if (mode === "cartesian") {
          for (const fn of artifact.functions ?? []) {
            const compiled = math.compile(fn.expr);
            for (let i = 0; i <= N; i++) {
              const x = xRange[0] + (xRange[1] - xRange[0]) * i / N;
              try {
                const y = Number(compiled.evaluate({ ...scope, x }));
                if (isFinite(y)) samples.push(y);
              } catch { /* skip */ }
            }
          }
        } else {
          for (const curve of artifact.curves ?? []) {
            const yc = math.compile(curve.yExpr);
            for (let i = 0; i <= N; i++) {
              const t = tRange[0] + (tRange[1] - tRange[0]) * i / N;
              try {
                const y = Number(yc.evaluate({ ...scope, t }));
                if (isFinite(y)) samples.push(y);
              } catch { /* skip */ }
            }
          }
        }
      } catch { /* skip */ }

      if (samples.length > 0) {
        samples.sort((a, b) => a - b);
        const p5 = samples[Math.floor(samples.length * 0.05)];
        const p95 = samples[Math.floor(samples.length * 0.95)];
        const margin = Math.max((p95 - p5) * 0.12, 0.5);
        yMin = p5 - margin;
        yMax = p95 + margin;
      } else {
        yMin = -2;
        yMax = 2;
      }
    }

    const toCanvasX = (x: number) => PAD.left + ((x - xRange[0]) / (xRange[1] - xRange[0])) * plotW;
    const toCanvasY = (y: number) => PAD.top + ((yMax! - y) / (yMax! - yMin!)) * plotH;

    ctx.fillStyle = "#fbf7ee";
    ctx.fillRect(0, 0, W, H);

    const xStep = niceGridStep(xRange[1] - xRange[0]);
    const yStep = niceGridStep(yMax! - yMin!);
    const xStart = Math.ceil((xRange[0] - 1e-9) / xStep) * xStep;
    const yStart = Math.ceil((yMin! - 1e-9) / yStep) * yStep;

    ctx.strokeStyle = "rgba(213,201,184,0.5)";
    ctx.lineWidth = 1;
    for (let gx = xStart; gx <= xRange[1] + xStep * 0.01; gx += xStep) {
      const cx = toCanvasX(gx);
      ctx.beginPath(); ctx.moveTo(cx, PAD.top); ctx.lineTo(cx, PAD.top + plotH); ctx.stroke();
    }
    for (let gy = yStart; gy <= yMax! + yStep * 0.01; gy += yStep) {
      const cy = toCanvasY(gy);
      ctx.beginPath(); ctx.moveTo(PAD.left, cy); ctx.lineTo(PAD.left + plotW, cy); ctx.stroke();
    }

    ctx.strokeStyle = "#3a352d";
    ctx.lineWidth = 1.5;
    if (yMin! <= 0 && yMax! >= 0) {
      const cy = toCanvasY(0);
      ctx.beginPath(); ctx.moveTo(PAD.left, cy); ctx.lineTo(PAD.left + plotW, cy); ctx.stroke();
    }
    if (xRange[0] <= 0 && xRange[1] >= 0) {
      const cx = toCanvasX(0);
      ctx.beginPath(); ctx.moveTo(cx, PAD.top); ctx.lineTo(cx, PAD.top + plotH); ctx.stroke();
    }

    ctx.fillStyle = "#6b6357";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let gx = xStart; gx <= xRange[1] + xStep * 0.01; gx += xStep) {
      ctx.fillText(formatTick(gx), toCanvasX(gx), PAD.top + plotH + 4);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let gy = yStart; gy <= yMax! + yStep * 0.01; gy += yStep) {
      ctx.fillText(formatTick(gy), PAD.left - 5, toCanvasY(gy));
    }

    if (artifact.xLabel) {
      ctx.fillStyle = "#3a352d";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(artifact.xLabel, PAD.left + plotW, H - 2);
    }
    if (artifact.yLabel) {
      ctx.save();
      ctx.fillStyle = "#3a352d";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.translate(12, PAD.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(artifact.yLabel, 0, 0);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD.left, PAD.top, plotW, plotH);
    ctx.clip();

    if (mode === "cartesian") {
      (artifact.functions ?? []).forEach((fn, fi) => {
        const color = fn.color ?? PALETTE[fi % PALETTE.length];
        try {
          const compiled = math.compile(fn.expr);
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          if (fn.dashed) ctx.setLineDash([6, 3]);
          let first = true;
          for (let i = 0; i <= N; i++) {
            const x = xRange[0] + (xRange[1] - xRange[0]) * i / N;
            try {
              const y = Number(compiled.evaluate({ ...scope, x }));
              if (isFinite(y)) {
                if (first) { ctx.moveTo(toCanvasX(x), toCanvasY(y)); first = false; }
                else ctx.lineTo(toCanvasX(x), toCanvasY(y));
              } else {
                first = true;
              }
            } catch { first = true; }
          }
          ctx.stroke();
          ctx.setLineDash([]);
        } catch { /* skip */ }
      });
    } else {
      (artifact.curves ?? []).forEach((curve, ci) => {
        const color = curve.color ?? PALETTE[ci % PALETTE.length];
        try {
          const xc = math.compile(curve.xExpr);
          const yc = math.compile(curve.yExpr);
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          let first = true;
          for (let i = 0; i <= N; i++) {
            const t = tRange[0] + (tRange[1] - tRange[0]) * i / N;
            try {
              const px = Number(xc.evaluate({ ...scope, t }));
              const py = Number(yc.evaluate({ ...scope, t }));
              if (isFinite(px) && isFinite(py)) {
                if (first) { ctx.moveTo(toCanvasX(px), toCanvasY(py)); first = false; }
                else ctx.lineTo(toCanvasX(px), toCanvasY(py));
              } else {
                first = true;
              }
            } catch { first = true; }
          }
          ctx.stroke();
        } catch { /* skip */ }
      });
    }

    ctx.restore();

    const legendItems = mode === "cartesian"
      ? (artifact.functions ?? []).map((f, i) => ({ label: f.label ?? f.expr, color: f.color ?? PALETTE[i % PALETTE.length] }))
      : (artifact.curves ?? []).map((c, i) => ({ label: c.label ?? `curve ${i + 1}`, color: c.color ?? PALETTE[i % PALETTE.length] }));

    if (legendItems.length > 0) {
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      let lx = PAD.left + 8;
      const ly = PAD.top + 12;
      for (const item of legendItems) {
        ctx.fillStyle = item.color;
        ctx.fillRect(lx, ly - 5, 16, 10);
        ctx.fillStyle = "#3a352d";
        ctx.fillText(item.label, lx + 20, ly);
        lx += 20 + ctx.measureText(item.label).width + 14;
        if (lx > PAD.left + plotW - 40) break;
      }
    }
  }, [artifact, paramValues]);

  const drawCanvasRef = useRef(drawCanvas);
  useEffect(() => {
    drawCanvasRef.current = drawCanvas;
  }, [drawCanvas]);

  useEffect(() => {
    getMathjs()
      .then((math) => {
        mathRef.current = math;
        drawCanvasRef.current();
      })
      .catch(() => setMathLoadError(true));
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      if (!w) return;
      const h = Math.max(240, Math.round(w * 0.56));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      drawCanvasRef.current();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="message-row tool">
      <div className="tool-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>render_math_explorer · complete</span>
        </div>
        <div className="visualizer" style={{ padding: "12px 16px" }}>
          <strong style={{ display: "block", marginBottom: 4, color: "#3a352d", fontSize: 14 }}>
            {artifact.title}
          </strong>
          <p style={{ margin: "0 0 12px", color: "#6b6357", fontSize: 13, lineHeight: 1.4 }}>
            {artifact.description}
          </p>
          <div ref={containerRef} style={{ width: "100%" }}>
            {mathLoadError ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#b56474", fontSize: 13, background: "#fde8eb", borderRadius: 10 }}>
                Failed to load math engine. Check network and reload.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                style={{ display: "block", width: "100%", borderRadius: 10, background: "#fbf7ee" }}
              />
            )}
          </div>
          {artifact.parameters.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {artifact.parameters.map((p) => (
                <label key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#3a352d", fontWeight: 500, minWidth: 80 }}>
                    {p.label ?? p.name}
                  </span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step ?? Math.max((p.max - p.min) / 100, 1e-6)}
                    value={paramValues[p.name] ?? p.default}
                    onChange={(e) =>
                      setParamValues((prev) => ({ ...prev, [p.name]: parseFloat(e.target.value) }))
                    }
                    style={{ flex: 1, minWidth: 120, accentColor: "#c8881a" }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color: "#6b6357",
                      minWidth: 48,
                      textAlign: "right",
                      fontFamily: "monospace",
                    }}
                  >
                    {(paramValues[p.name] ?? p.default).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
