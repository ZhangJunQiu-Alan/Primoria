"use client";

import { useId, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import { WIDGET_COLORS as C } from "../palette";
import { WidgetShell } from "./widget-shell";

export function useSceneLocale() {
  const { language } = useI18n();
  return (zh: string, en: string) => language === "zh" ? zh : en;
}

export function SceneFrame({ id, title, description, children, controls, readouts, explanation }: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  controls: ReactNode;
  readouts: ReadonlyArray<{ label: string; value: ReactNode; unit?: string }>;
  explanation: ReactNode;
}) {
  return <WidgetShell componentId={id} title={title} className="primoria-teaching-scene">
    <style>{`@container primoria-scene (max-width: 440px) {.primoria-teaching-scene svg text{font-size:22px}.primoria-teaching-scene .primoria-cartesian-plot text{font-size:26px}}`}</style>
    <p style={{ margin: 0, padding: "14px 18px 6px", color: C.muted, fontSize: 13, lineHeight: 1.65 }}>{description}</p>
    {children}
    <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(max(120px, calc((100% - 36px) / 4)), 1fr))", margin: 0, padding: "4px 18px 16px", gap: 12 }}>
      {readouts.map(({ label, value, unit }) => <div key={label} style={{ paddingLeft: 10, borderLeft: `2px solid ${C.accent}` }}>
        <dt style={{ color: C.muted, fontSize: 11, lineHeight: 1.5 }}>{label}</dt>
        <dd style={{ margin: "4px 0 0", color: C.ink, fontSize: 19, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{value}{unit ? <small style={{ color: C.muted, fontSize: 11, marginLeft: 4 }}>{unit}</small> : null}</dd>
      </div>)}
    </dl>
    <div style={{ display: "grid", gap: 12, padding: "14px 18px", borderTop: `1px solid ${C.line}` }}>{controls}</div>
    <div role="note" style={{ padding: "12px 18px 16px", color: C.ink, fontSize: 12, lineHeight: 1.8, background: C.surfaceSoft }}>{explanation}</div>
  </WidgetShell>;
}

export const PLOT = { width: 680, height: 400, left: 112, right: 642, top: 48, bottom: 304 };

export function plotCoordinates(xMin: number, xMax: number, yMin: number, yMax: number) {
  return {
    x: (value: number) => PLOT.left + (value - xMin) / (xMax - xMin) * (PLOT.right - PLOT.left),
    y: (value: number) => PLOT.bottom - (value - yMin) / (yMax - yMin) * (PLOT.bottom - PLOT.top),
  };
}

export function quadraticSceneXRange(features: readonly number[]) {
  const values = [0, ...features.filter((value) => Number.isFinite(value) && Math.abs(value) <= 12)];
  const minimum = Math.min(...values), maximum = Math.max(...values), span = maximum - minimum;
  if (span < 0.01) return { xMin: -3, xMax: 3 };
  const padding = Math.max(1.5, span * 0.3);
  return { xMin: Math.max(-16, minimum - padding), xMax: Math.min(16, maximum + padding) };
}

export function unplotCoordinates(x: number, y: number, xMin: number, xMax: number, yMin: number, yMax: number) {
  return { x: xMin + (x - PLOT.left) / (PLOT.right - PLOT.left) * (xMax - xMin), y: yMax - (y - PLOT.top) / (PLOT.bottom - PLOT.top) * (yMax - yMin) };
}

export function curvePath(fn: (x: number) => number | null, xMin: number, xMax: number, yMin: number, yMax: number, samples = 200) {
  const p = plotCoordinates(xMin, xMax, yMin, yMax);
  let path = "";
  let connected = false;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + (xMax - xMin) * i / samples;
    const y = fn(x);
    if (y === null || !Number.isFinite(y) || Math.abs(y) > Math.max(Math.abs(yMin), Math.abs(yMax), 1) * 20) { connected = false; continue; }
    path += `${connected ? "L" : "M"}${p.x(x).toFixed(2)},${p.y(y).toFixed(2)}`;
    connected = true;
  }
  return path;
}

export function niceAxisTicks(minimum: number, maximum: number, intervals: number) {
  const span = maximum - minimum;
  if (![minimum, maximum, intervals, span].every(Number.isFinite) || span <= 0 || intervals <= 0) return [];
  const raw = span / intervals, scale = 10 ** Math.floor(Math.log10(raw));
  const multiplier = [1, 2, 2.5, 5, 10].find((value) => value >= raw / scale - 1e-12) ?? 10;
  const step = multiplier * scale, first = Math.ceil(minimum / step - 1e-10), last = Math.floor(maximum / step + 1e-10);
  return Array.from({ length: Math.max(0, Math.min(100, last - first + 1)) }, (_, i) => Number(((first + i) * step).toPrecision(12)));
}

export function CartesianPlot({ xMin, xMax, yMin, yMax, xLabel = "x", yLabel = "y", xTicks, label, children }: {
  xMin: number; xMax: number; yMin: number; yMax: number; xLabel?: string; yLabel?: string; xTicks?: readonly number[]; label: string; children: ReactNode;
}) {
  const clipId = useId().replace(/:/g, "");
  const p = plotCoordinates(xMin, xMax, yMin, yMax);
  const xAxisY = p.y(Math.max(yMin, Math.min(yMax, 0)));
  const yAxisX = p.x(Math.max(xMin, Math.min(xMax, 0)));
  const xValues = xTicks ?? niceAxisTicks(xMin, xMax, 6);
  const tick = (value: number) => Math.abs(value) >= 10000 ? value.toExponential(1).replace("e+", "e") : Number(value.toPrecision(3));
  return <svg className="primoria-cartesian-plot" viewBox={`0 0 ${PLOT.width} ${PLOT.height}`} role="img" aria-label={label} style={{ display: "block", width: "100%", maxHeight: 420 }}>
    <defs><clipPath id={clipId}><rect x={PLOT.left} y={PLOT.top} width={PLOT.right - PLOT.left} height={PLOT.bottom - PLOT.top} /></clipPath></defs>
    {xValues.map((x, i) => {
      const count = xValues.length;
      return <g key={`x${i}`}><line x1={p.x(x)} x2={p.x(x)} y1={PLOT.top} y2={PLOT.bottom} stroke={C.line} /><text x={p.x(x)} y={PLOT.bottom + 38} fill={C.muted} fontSize={13} textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"}>{tick(x)}</text></g>;
    })}
    {niceAxisTicks(yMin, yMax, 4).map((y, i) => {
      return <g key={`y${i}`}><line x1={PLOT.left} x2={PLOT.right} y1={p.y(y)} y2={p.y(y)} stroke={C.line} /><text x={PLOT.left - 8} y={p.y(y) + 4} fill={C.muted} fontSize={13} textAnchor="end">{tick(y)}</text></g>;
    })}
    <line x1={PLOT.left} x2={PLOT.right} y1={xAxisY} y2={xAxisY} stroke={C.muted} strokeWidth={1.3} />
    <line x1={yAxisX} x2={yAxisX} y1={PLOT.top} y2={PLOT.bottom} stroke={C.muted} strokeWidth={1.3} />
    <text x={(PLOT.left + PLOT.right) / 2} y={PLOT.height - 7} fill={C.muted} textAnchor="middle" fontSize={14}>{xLabel}</text>
    <text x={PLOT.left} y={30} fill={C.muted} fontSize={14}>{yLabel}</text>
    <g clipPath={`url(#${clipId})`}>{children}</g>
  </svg>;
}
