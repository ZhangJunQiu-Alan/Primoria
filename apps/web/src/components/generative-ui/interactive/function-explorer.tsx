"use client";

import { evaluateBaseFunction, evaluateTransformedFunction, type FunctionExplorerConfig } from "@/lib/interactive/components/function-explorer";
import { WIDGET_COLORS } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

const W = 680;
const H = 320;
const SX = W / 20;
const SY = H / 16;
function graphPath(config: FunctionExplorerConfig, original: boolean) {
  const chunks: string[] = [];
  let penDown = false;
  for (let index = 0; index <= 320; index += 1) {
    const x = -10 + index / 16;
    const y = original ? evaluateBaseFunction(config.functionType, x) : evaluateTransformedFunction(config, x);
    if (y === null || !Number.isFinite(y) || Math.abs(y) > 30) { penDown = false; continue; }
    chunks.push(`${penDown ? "L" : "M"}${(W / 2 + x * SX).toFixed(1)},${(H / 2 - y * SY).toFixed(1)}`);
    penDown = true;
  }
  return chunks.join(" ");
}

export function FunctionExplorerWidget({ config, onChange }: { config: FunctionExplorerConfig; onChange: (next: FunctionExplorerConfig) => void }) {
  const set = <K extends keyof FunctionExplorerConfig>(key: K, value: FunctionExplorerConfig[K]) => onChange({ ...config, [key]: value });
  return (
    <WidgetShell componentId="math.function-explorer" title="函数变换 · y = a·f(b(x-h)) + k">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="原函数与变换后函数图象" style={{ display: "block", width: "100%" }}>
        {Array.from({ length: 21 }, (_, index) => <line key={`x${index}`} x1={index * SX} y1="0" x2={index * SX} y2={H} stroke={WIDGET_COLORS.line} opacity={index === 10 ? 1 : 0.35} />)}
        {Array.from({ length: 17 }, (_, index) => <line key={`y${index}`} x1="0" y1={index * SY} x2={W} y2={index * SY} stroke={WIDGET_COLORS.line} opacity={index === 8 ? 1 : 0.35} />)}
        {config.showOriginal ? <path d={graphPath(config, true)} fill="none" stroke={WIDGET_COLORS.muted} strokeWidth="1.5" strokeDasharray="5 4" /> : null}
        <path d={graphPath(config, false)} fill="none" stroke={WIDGET_COLORS.series2} strokeWidth="3" />
      </svg>
      <div style={{ display: "grid", gap: 10, padding: 14 }}>
        <SegmentedControl label="母函数" value={config.functionType} options={[["quadratic", "x²"], ["sin", "sin x"], ["abs", "|x|"], ["sqrt", "√x"]]} onChange={(value) => set("functionType", value)} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: "9px 22px" }}>
          <SliderRow label="纵向 a" min={-3} max={3} step={0.1} value={config.a} onChange={(value) => set("a", value)} />
          <SliderRow label="横向 b" min={0.25} max={4} step={0.25} value={config.b} onChange={(value) => set("b", value)} />
          <SliderRow label="水平 h" min={-5} max={5} step={0.25} value={config.h} onChange={(value) => set("h", value)} />
          <SliderRow label="垂直 k" min={-5} max={5} step={0.25} value={config.k} onChange={(value) => set("k", value)} />
        </div>
        <label style={{ color: WIDGET_COLORS.muted, fontSize: 12 }}><input type="checkbox" checked={config.showOriginal} onChange={(event) => set("showOriginal", event.target.checked)} /> 显示母函数虚线</label>
      </div>
    </WidgetShell>
  );
}
