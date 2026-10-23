"use client";

import { computeReactionKinetics, type ReactionKineticsConfig } from "@/lib/interactive/components/reaction-kinetics";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function ReactionKineticsWidget({ config, onChange }: { config: ReactionKineticsConfig; onChange: (next: ReactionKineticsConfig) => void }) {
  const t = useSceneLocale();
  const r = computeReactionKinetics(config);
  const xmax = Math.max(1, config.elapsedSeconds * 1.1, Math.min(60, r.halfLife * 4));
  const ymax = config.initialConcentration * 1.1;
  const p = plotCoordinates(0, xmax, 0, ymax);
  const set = <K extends keyof ReactionKineticsConfig>(key: K, value: ReactionKineticsConfig[K]) => onChange({ ...config, [key]: value });
  const units = { zero: "mol/(L·s)", first: "s⁻¹", second: "L/(mol·s)" }[config.order];
  const fmt = (value: number) => value > 0 && (value < 0.001 || value > 10000) ? value.toExponential(3) : value.toFixed(3);
  return <SceneFrame id="chem.reaction-kinetics" title={t("为什么反应越来越慢？", "Why does a reaction slow down?")} description={t("比较不同反应级数下的浓度曲线，再升温观察速率常数如何改变。模型为不可逆 A → B。", "Compare concentration curves across reaction orders, then change temperature. The model is an irreversible A → B reaction.")}
    readouts={[{ label: "[A]", value: fmt(r.concentration), unit: "mol/L" }, { label: `k (${config.temperatureK} K)`, value: fmt(r.rateConstant), unit: units }, { label: t("瞬时速率", "Current rate"), value: fmt(r.rate), unit: "mol/(L·s)" }, ...(config.showHalfLife ? [{ label: t("半衰期", "Half-life"), value: fmt(r.halfLife), unit: "s" }] : [])]}
    controls={<>
      <SegmentedControl label={t("反应级数", "Order")} value={config.order} options={[["zero", t("零级", "Zero")], ["first", t("一级", "First")], ["second", t("二级", "Second")]]} onChange={(v) => set("order", v)} />
      <SliderRow label={t("初始浓度", "Initial [A]")} min={0.1} max={2} step={0.1} value={config.initialConcentration} unit="M" onChange={(v) => set("initialConcentration", v)} />
      <SliderRow label="k (298K)" min={0.01} max={1} step={0.01} value={config.referenceRate} onChange={(v) => set("referenceRate", v)} />
      <SliderRow label={t("温度", "Temperature")} min={273} max={373} step={1} value={config.temperatureK} unit="K" onChange={(v) => set("temperatureK", v)} />
      <SliderRow label="Eₐ" min={10} max={100} step={1} value={config.activationEnergyKJ} unit="kJ/mol" onChange={(v) => set("activationEnergyKJ", v)} />
      <SliderRow label={t("时间", "Time")} min={0} max={60} step={0.1} value={config.elapsedSeconds} unit="s" onChange={(v) => set("elapsedSeconds", v)} />
      <label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showHalfLife} onChange={(e) => set("showHalfLife", e.target.checked)} />{t("显示半衰期", "Show half-life")}</label>
    </>}
    explanation={<><strong>{({ zero: "[A] = [A]₀ − kt", first: "[A] = [A]₀e⁻ᵏᵗ", second: "1/[A] = 1/[A]₀ + kt" })[config.order]}</strong><br />{t("蓝线是反应物，绿色虚线是按1:1计量生成的产物，两者浓度之和不变。升温通过活化能改变速率常数；这里只表示动力学，不把速度快误认为平衡产率高。", "The blue line is reactant and the dashed green line is 1:1 product; their concentrations sum to a constant. Temperature changes the rate constant through activation energy. Faster kinetics does not imply a higher equilibrium yield.")}</>}>
    <CartesianPlot xMin={0} xMax={xmax} yMin={0} yMax={ymax} xLabel="t / s" yLabel="mol/L" label={t("反应物和产物浓度随时间变化", "Reactant and product concentrations over time")}>
      <path d={curvePath(r.concentrationAt, 0, xmax, 0, ymax)} stroke={C.series2} strokeWidth={3} fill="none" />
      <path d={curvePath((time) => config.initialConcentration - r.concentrationAt(time), 0, xmax, 0, ymax)} stroke={C.accent} strokeWidth={2} strokeDasharray="6 4" fill="none" />
      {config.showHalfLife && r.halfLife <= xmax ? <path d={`M${p.x(r.halfLife)},${p.y(0)}V${p.y(config.initialConcentration / 2)}H${p.x(0)}`} stroke={C.series1} strokeDasharray="3 4" fill="none" /> : null}
      <circle cx={p.x(config.elapsedSeconds)} cy={p.y(r.concentration)} r={6} fill={C.series2} stroke={C.surface} strokeWidth={2} />
    </CartesianPlot>
  </SceneFrame>;
}
