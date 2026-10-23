"use client";

import { computeChemicalEquilibrium, type ChemicalEquilibriumConfig } from "@/lib/interactive/components/chemical-equilibrium";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function ChemicalEquilibriumWidget({ config, onChange }: { config: ChemicalEquilibriumConfig; onChange: (next: ChemicalEquilibriumConfig) => void }) {
  const t = useSceneLocale();
  const r = computeChemicalEquilibrium(config);
  const set = <K extends keyof ChemicalEquilibriumConfig>(key: K, value: ChemicalEquilibriumConfig[K]) => onChange({ ...config, [key]: value });
  const rates = config.view === "rates";
  const xmax = Math.max(10, config.elapsedSeconds * 1.1, Math.min(60, r.relaxationTime * 6));
  const ymax = Math.max(0.1, rates ? r.total * Math.max(config.forwardRate, config.reverseRate) : r.total) * 1.1;
  const p = plotCoordinates(0, xmax, 0, ymax);
  const eqY = rates ? config.forwardRate * r.equilibriumA : r.equilibriumA;
  return <SceneFrame id="chem.chemical-equilibrium" title={t("平衡时，反应停了吗？", "Does a reaction stop at equilibrium?")} description={t("封闭体系中 A ⇌ B 同时向两个方向进行。比较浓度与速率，区分动态平衡和完全转化。", "In a closed A ⇌ B system, both directions continue. Compare concentrations and rates to distinguish equilibrium from complete conversion.")}
    readouts={[{ label: "[A]", value: r.current.a.toFixed(3), unit: "M" }, { label: "[B]", value: r.current.b.toFixed(3), unit: "M" }, { label: "K = k₊ / k₋", value: r.equilibriumConstant.toFixed(3) }, { label: "v₊ − v₋", value: (r.current.forward - r.current.reverse).toFixed(4), unit: "M/s" }]}
    controls={<>
      <SliderRow label="k₊" min={0.01} max={1} step={0.01} value={config.forwardRate} unit="s⁻¹" onChange={(v) => set("forwardRate", v)} />
      <SliderRow label="k₋" min={0.01} max={1} step={0.01} value={config.reverseRate} unit="s⁻¹" onChange={(v) => set("reverseRate", v)} />
      <SliderRow label="[A]₀" min={0} max={2} step={0.1} value={config.initialA} unit="M" onChange={(v) => set("initialA", v)} />
      <SliderRow label="[B]₀" min={0} max={2} step={0.1} value={config.initialB} unit="M" onChange={(v) => set("initialB", v)} />
      <SliderRow label={t("时间", "Time")} min={0} max={60} step={0.1} value={config.elapsedSeconds} unit="s" onChange={(v) => set("elapsedSeconds", v)} />
      <SegmentedControl label={t("观察", "View")} value={config.view} options={[["concentrations", t("浓度", "Concentrations")], ["rates", t("正逆速率", "Rates")]]} onChange={(v) => set("view", v)} />
      <label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showEquilibrium} onChange={(e) => set("showEquilibrium", e.target.checked)} /> {t("显示平衡参考", "Equilibrium reference")}</label>
    </>}
    explanation={t("蓝线表示A（或正反应），绿色虚线表示B（或逆反应）。平衡时 v₊ = v₋，两者通常都不为零；[A]+[B] 始终守恒。这里是1:1一级可逆模型，不将此比值公式推广到任意反应。", "Blue represents A or the forward rate; dashed green represents B or the reverse rate. At equilibrium v₊ = v₋, usually with both nonzero, while [A]+[B] stays constant. This 1:1 first-order model is not a formula for arbitrary reactions.")}>
    <CartesianPlot xMin={0} xMax={xmax} yMin={0} yMax={ymax} xLabel="t / s" yLabel={rates ? "M/s" : "mol/L"} label={t("可逆反应浓度与速率曲线", "Reversible reaction concentrations and rates")}>
      <path d={curvePath((time) => rates ? r.stateAt(time).forward : r.stateAt(time).a, 0, xmax, 0, ymax)} stroke={C.series2} strokeWidth={3} fill="none" />
      <path d={curvePath((time) => rates ? r.stateAt(time).reverse : r.stateAt(time).b, 0, xmax, 0, ymax)} stroke={C.accent} strokeWidth={3} strokeDasharray="6 4" fill="none" />
      {config.showEquilibrium ? <line x1={p.x(0)} x2={p.x(xmax)} y1={p.y(eqY)} y2={p.y(eqY)} stroke={C.series1} strokeDasharray="3 5" /> : null}
      <circle cx={p.x(config.elapsedSeconds)} cy={p.y(rates ? r.current.forward : r.current.a)} r={5} fill={C.series2} />
    </CartesianPlot>
  </SceneFrame>;
}
