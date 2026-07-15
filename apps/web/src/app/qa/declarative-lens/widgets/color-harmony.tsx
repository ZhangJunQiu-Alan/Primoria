"use client";

import { deriveColorHarmony, type ColorHarmonyConfig } from "@/lib/qa/components/color-harmony";
import { WIDGET_COLORS } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

export function ColorHarmonyWidget({ config, onChange }: { config: ColorHarmonyConfig; onChange: (next: ColorHarmonyConfig) => void }) {
  const swatches = deriveColorHarmony(config);
  const set = <K extends keyof ColorHarmonyConfig>(key: K, value: ColorHarmonyConfig[K]) => onChange({ ...config, [key]: value });
  return (
    <WidgetShell componentId="arts.color-harmony" title="色彩和声 · 色轮关系">
      <div style={{ display: "grid", gridTemplateColumns: "210px minmax(220px,1fr)", gap: 24, alignItems: "center", padding: 20 }}>
        <div aria-label="色轮" style={{ position: "relative", width: 190, height: 190, borderRadius: "50%", background: "conic-gradient(hsl(0 75% 55%),hsl(60 75% 55%),hsl(120 75% 45%),hsl(180 75% 45%),hsl(240 75% 55%),hsl(300 75% 55%),hsl(360 75% 55%))", boxShadow: `inset 0 0 0 28px ${WIDGET_COLORS.surface}` }}>{swatches.map((swatch) => { const angle = (swatch.hueDeg - 90) * Math.PI / 180; return <span key={swatch.hueDeg} title={`${swatch.hueDeg}°`} style={{ position: "absolute", left: 87 + Math.cos(angle) * 77, top: 87 + Math.sin(angle) * 77, width: 16, height: 16, borderRadius: "50%", background: swatch.css, border: `3px solid ${WIDGET_COLORS.surface}`, boxShadow: `0 0 0 1px ${WIDGET_COLORS.ink}` }} />; })}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${swatches.length},1fr)`, minHeight: 150, borderRadius: 10, overflow: "hidden", border: `1px solid ${WIDGET_COLORS.line}` }}>{swatches.map((swatch) => <div key={swatch.hueDeg} style={{ display: "grid", alignContent: "end", padding: 10, background: swatch.css }}><span style={{ padding: "3px 6px", borderRadius: 5, background: "rgb(255 255 255 / 82%)", color: WIDGET_COLORS.ink, fontSize: 11, fontWeight: 700 }}>{swatch.hueDeg}°</span></div>)}</div>
      </div>
      <div style={{ display: "grid", gap: 10, padding: "0 14px 14px" }}><SegmentedControl label="和声关系" value={config.harmony} options={[["complementary", "互补"], ["analogous", "类似"], ["triadic", "三角"]]} onChange={(value) => set("harmony", value)} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "9px 22px" }}><SliderRow label="基础色相" min={0} max={359} step={1} value={config.baseHueDeg} unit="°" onChange={(value) => set("baseHueDeg", value)} /><SliderRow label="饱和度" min={10} max={100} step={1} value={config.saturationPct} unit="%" onChange={(value) => set("saturationPct", value)} /><SliderRow label="明度" min={15} max={85} step={1} value={config.lightnessPct} unit="%" onChange={(value) => set("lightnessPct", value)} /></div></div>
    </WidgetShell>
  );
}
