"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

export function screenPointToSvg(x: number, y: number, matrix: { a: number; b: number; c: number; d: number; e: number; f: number }) {
  const { a, b, c, d, e, f } = matrix, determinant = a * d - b * c;
  if (![x, y, a, b, c, d, e, f].every(Number.isFinite) || Math.abs(determinant) < 1e-12) return null;
  return { x: (d * (x - e) - c * (y - f)) / determinant, y: (-b * (x - e) + a * (y - f)) / determinant };
}

export function useDragViewport(bounds: { xMin: number; xMax: number; yMin: number; yMax: number }) {
  const [viewport, setViewport] = useState(bounds), [dragging, setDragging] = useState(false);
  const release = useCallback(() => setDragging(false), []);
  const zoom = useCallback((factor: number) => setViewport((current) => {
    const width = (current.xMax - current.xMin) * factor, height = (current.yMax - current.yMin) * factor;
    if (!Number.isFinite(factor) || width < 0.25 || width > 64 || height < 1e-4 || height > 1e6) return current;
    const x = (current.xMin + current.xMax) / 2, y = (current.yMin + current.yMax) / 2;
    return { xMin: x - width / 2, xMax: x + width / 2, yMin: y - height / 2, yMax: y + height / 2 };
  }), []);
  return { viewport, dragging, lock: () => setDragging(true), release, zoom, fit: () => setViewport(bounds) };
}

export function PlotViewportControls({ onZoom, onFit, disabled, labels }: { onZoom: (factor: number) => void; onFit: () => void; disabled: boolean; labels: [string, string, string] }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{labels.map((label, index) => <button key={label} type="button" disabled={disabled} onClick={() => index === 2 ? onFit() : onZoom(index === 0 ? 0.8 : 1.25)} style={{ padding: "6px 10px", border: "1px solid currentColor", borderRadius: 6, background: "transparent", color: "inherit", cursor: disabled ? "default" : "pointer", font: "inherit", fontSize: 12 }}>{label}</button>)}</div>;
}

export function SvgDragHandle({ x, y, label, tone, onMove, onDragStart, onDragEnd }: { x: number; y: number; label: string; tone: string; onMove: (x: number, y: number) => void; onDragStart?: () => void; onDragEnd?: () => void }) {
  const pointer = useRef<number | null>(null);
  useEffect(() => () => { if (pointer.current !== null) onDragEnd?.(); }, [onDragEnd]);
  const finish = (event: PointerEvent<SVGGElement>) => { if (pointer.current !== event.pointerId) return; pointer.current = null; onDragEnd?.(); };
  const move = (event: PointerEvent<SVGGElement>) => {
    if (pointer.current !== event.pointerId) return;
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    const point = matrix ? screenPointToSvg(event.clientX, event.clientY, matrix) : null;
    if (point) onMove(point.x, point.y);
  };
  return <g data-drag-handle={label} aria-hidden="true" style={{ cursor: "grab", touchAction: "none" }}
    onPointerDown={(event) => { if (!event.isPrimary) return; event.preventDefault(); pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); onDragStart?.(); }}
    onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
    <title>{label}</title><circle cx={x} cy={y} r={30} fill="transparent" /><circle cx={x} cy={y} r={9} fill={tone} stroke="white" strokeWidth={2} /><circle cx={x} cy={y} r={15} fill="none" stroke={tone} strokeOpacity={0.35} strokeWidth={2} />
  </g>;
}
