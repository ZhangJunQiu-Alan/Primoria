"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { classifyAngle, type AngleMeasureConfig } from "@/lib/qa/components/angle-measure";
import { WIDGET_COLORS } from "./palette";
import { Readout, SliderRow } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

const W = 680;
const H = 310;
const CX = 270;
const CY = 235;
const R = 170;

export function AngleMeasureWidget({ config, onChange }: { config: AngleMeasureConfig; onChange: (next: AngleMeasureConfig) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const radians = config.angleDeg * Math.PI / 180;
  const tip = { x: CX + R * Math.cos(radians), y: CY - R * Math.sin(radians) };
  const set = <K extends keyof AngleMeasureConfig>(key: K, value: AngleMeasureConfig[K]) => onChange({ ...config, [key]: value });
  const move = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (!svgRef.current || event.buttons === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) * W / rect.width;
    const y = (event.clientY - rect.top) * H / rect.height;
    const degrees = Math.atan2(CY - y, x - CX) * 180 / Math.PI;
    set("angleDeg", Math.round(Math.max(0, Math.min(180, degrees))));
  };
  return (
    <WidgetShell componentId="math.angle-measure" title="角度测量 · 拖动射线端点">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${config.angleDeg} 度${classifyAngle(config.angleDeg)}`} style={{ display: "block", width: "100%", touchAction: "none" }}>
        {config.showProtractor ? Array.from({ length: 19 }, (_, index) => {
          const angle = index * 10 * Math.PI / 180;
          const inner = index % 3 === 0 ? R - 18 : R - 10;
          return <line key={index} x1={CX + inner * Math.cos(angle)} y1={CY - inner * Math.sin(angle)} x2={CX + R * Math.cos(angle)} y2={CY - R * Math.sin(angle)} stroke={WIDGET_COLORS.line} strokeWidth={index % 3 === 0 ? 2 : 1} />;
        }) : null}
        <path d={`M ${CX + 58} ${CY} A 58 58 0 ${config.angleDeg > 180 ? 1 : 0} 0 ${CX + 58 * Math.cos(radians)} ${CY - 58 * Math.sin(radians)}`} fill="none" stroke={WIDGET_COLORS.series1} strokeWidth="8" strokeLinecap="round" opacity="0.65" />
        <line x1={CX - 185} y1={CY} x2={CX + R + 15} y2={CY} stroke={WIDGET_COLORS.muted} strokeWidth="2" />
        <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={WIDGET_COLORS.series2} strokeWidth="4" strokeLinecap="round" />
        <circle cx={tip.x} cy={tip.y} r="11" fill={WIDGET_COLORS.accent} stroke={WIDGET_COLORS.surface} strokeWidth="3" onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={move} style={{ cursor: "grab" }} />
        <text x={CX + 75 * Math.cos(radians / 2)} y={CY - 75 * Math.sin(radians / 2)} textAnchor="middle" fill={WIDGET_COLORS.ink} fontSize="16" fontWeight="700">{config.angleDeg}°</text>
      </svg>
      <div style={{ display: "grid", gap: 10, padding: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Readout label="角度" value={`${config.angleDeg}°`} tone="accent" />{config.showClassification ? <Readout label="分类" value={classifyAngle(config.angleDeg)} /> : null}</div>
        <SliderRow label="角度" min={0} max={180} step={1} value={config.angleDeg} unit="°" onChange={(value) => set("angleDeg", value)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: WIDGET_COLORS.muted, fontSize: 12 }}>
          <label><input type="checkbox" checked={config.showClassification} onChange={(event) => set("showClassification", event.target.checked)} /> 显示分类</label>
          <label><input type="checkbox" checked={config.showProtractor} onChange={(event) => set("showProtractor", event.target.checked)} /> 显示量角器刻度</label>
        </div>
      </div>
    </WidgetShell>
  );
}
