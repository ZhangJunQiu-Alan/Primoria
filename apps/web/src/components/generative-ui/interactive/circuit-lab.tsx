"use client";

import { computeCircuit, type CircuitLabConfig } from "@/lib/interactive/components/circuit-lab";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function CircuitLabWidget({ config, onChange }: { config: CircuitLabConfig; onChange: (next: CircuitLabConfig) => void }) {
  const t = useSceneLocale();
  const r = computeCircuit(config);
  const set = <K extends keyof CircuitLabConfig>(key: K, value: CircuitLabConfig[K]) => onChange({ ...config, [key]: value });
  const parallel = config.topology === "parallel";
  const resistor = (x: number, y: number, label: string, resistance: number, voltage: number) => <g>
    <rect x={x - 53} y={y - 16} width={106} height={32} rx={3} fill={C.surface} stroke={C.series1} strokeWidth={2.5} />
    <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fill={C.ink}>{label} · {resistance}Ω</text>
    <text x={x} y={y - 30} textAnchor="middle" fontSize={13} fill={C.series2}>{voltage.toFixed(2)} V</text>
  </g>;
  return <SceneFrame id="physics.circuit-lab" title={t("电流怎样分配？", "How does current divide?")} description={t("同样两只电阻，切换连接方式，观察分流、分压和功率守恒。", "Keep both resistors and switch their topology to compare current, voltage and power.")}
    readouts={[{ label: t("等效电阻", "Equivalent resistance"), value: r.equivalentResistance === null ? "∞" : r.equivalentResistance.toFixed(1), unit: "Ω" }, { label: t("电源电流", "Source current"), value: (r.current * 1000).toFixed(1), unit: "mA" }, { label: t("总功率", "Total power"), value: r.power.toFixed(3), unit: "W" }]}
    controls={<>
      <SegmentedControl label={t("连接", "Connection")} value={config.topology} options={[["series", t("串联", "Series")], ["parallel", t("并联", "Parallel")]]} onChange={(v) => set("topology", v)} />
      <SliderRow label={t("电源电压", "Voltage")} min={0} max={24} step={0.5} value={config.voltage} unit="V" onChange={(v) => set("voltage", v)} />
      <SliderRow label="R₁" min={1} max={1000} step={1} value={config.resistance1} unit="Ω" onChange={(v) => set("resistance1", v)} />
      <SliderRow label="R₂" min={1} max={1000} step={1} value={config.resistance2} unit="Ω" onChange={(v) => set("resistance2", v)} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: C.muted }}><label><input type="checkbox" checked={config.switchClosed} onChange={(e) => set("switchClosed", e.target.checked)} /> {t("闭合开关", "Close switch")}</label><label><input type="checkbox" checked={config.showCurrent} onChange={(e) => set("showCurrent", e.target.checked)} /> {t("显示电流", "Show currents")}</label></div>
    </>}
    explanation={!config.switchClosed ? t("开关断开，整个回路无电流。电源仍有端电压，但电阻两端电压为零；断开的开关承受电源电压。", "The open switch breaks the circuit. The source voltage remains, but current and resistor voltage drops are zero. The source voltage appears across the open switch.") : parallel ? t("并联：U₁ = U₂ = U；I = I₁ + I₂。电阻越小的支路电流越大。总功率等于两只电阻功率之和。", "Parallel: U₁ = U₂ = U and I = I₁ + I₂. The smaller resistance carries more current. Total power equals the sum of resistor powers.") : t("串联：I₁ = I₂；U = U₁ + U₂。电阻越大，分到的电压越大。这里使用理想元件。", "Series: I₁ = I₂ and U = U₁ + U₂. The larger resistance has the larger voltage drop. Components are ideal.")}>
    <svg viewBox="0 0 680 300" role="img" aria-label={t("直流串并联电路及实时电压电流", "DC resistor circuit with live voltage and current")} style={{ width: "100%", display: "block" }}>
      <path d={parallel ? "M110,137V70H190M250,70H285V190M525,120V250H110V163" : "M110,137V70H190M250,70H570V250H110V163"} fill="none" stroke={C.muted} strokeWidth={2.5} />
      <line x1={88} x2={132} y1={137} y2={137} stroke={C.ink} strokeWidth={3} /><line x1={98} x2={122} y1={163} y2={163} stroke={C.ink} strokeWidth={5} />
      <text x={75} y={124} fill={C.ink} fontSize={14}>+</text><text x={75} y={185} fill={C.ink} fontSize={13}>{config.voltage}V</text>
      <circle cx={190} cy={70} r={3} fill={C.ink} /><circle cx={250} cy={70} r={3} fill={C.ink} /><path d={`M190,70L250,${config.switchClosed ? 70 : 43}`} stroke={C.accent} strokeWidth={3} fill="none" />
      {parallel ? <><path d="M285,190H525M285,120H525" fill="none" stroke={C.muted} strokeWidth={2.5} />{resistor(405, 120, "R₁", config.resistance1, r.voltage1)}{resistor(405, 190, "R₂", config.resistance2, r.voltage2)}</> : <>{resistor(345, 70, "R₁", config.resistance1, r.voltage1)}{resistor(495, 250, "R₂", config.resistance2, r.voltage2)}</>}
      {config.showCurrent ? <><text x={420} y={parallel ? 224 : 148} textAnchor="middle" fill={C.accent} fontSize={14}>I₁ = {(1000 * r.current1).toFixed(1)} mA · I₂ = {(1000 * r.current2).toFixed(1)} mA</text><text x={295} y={282} textAnchor="middle" fill={C.muted} fontSize={12}>P₁ + P₂ = {(r.power1 + r.power2).toFixed(3)} W</text></> : null}
    </svg>
  </SceneFrame>;
}
