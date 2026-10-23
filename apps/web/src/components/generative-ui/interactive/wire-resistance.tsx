"use client";

import { computeWireResistance, type WireResistanceConfig } from "@/lib/interactive/components/wire-resistance";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function WireResistanceWidget({ config, onChange }: { config: WireResistanceConfig; onChange: (next: WireResistanceConfig) => void }) {
  const t = useSceneLocale(), r = computeWireResistance(config);
  const set = <K extends keyof WireResistanceConfig>(key: K, value: WireResistanceConfig[K]) => onChange({ ...config, [key]: value });
  const format = (value: number) => Number(value.toPrecision(4)).toString();
  const graph = config.view !== "geometry";
  const varying = config.view === "length" ? "lengthM" : config.view === "area" ? "areaMM2" : "temperatureC";
  const xMin = varying === "lengthM" ? 0 : varying === "areaMM2" ? 0.05 : -20;
  const xMax = varying === "lengthM" ? 20 : varying === "areaMM2" ? 10 : 150;
  const resistanceAt = (x: number) => computeWireResistance({ ...config, [varying]: x }).resistance;
  const yMax = Math.max(0.001, resistanceAt(xMin), resistanceAt(xMax)) * 1.15;
  const p = plotCoordinates(xMin, xMax, 0, yMax);
  const xLabel = varying === "lengthM" ? "L / m" : varying === "areaMM2" ? "A / mm²" : "T / °C";
  const wireLength = 110 + 340 * Math.sqrt(config.lengthM / 20), radius = 10 + 42 * Math.sqrt(config.areaMM2 / 10), left = (680 - wireLength) / 2, right = left + wireLength;
  return <SceneFrame id="physics.wire-resistance" title={t("为什么长导线电阻更大？", "What sets a wire’s resistance?")} description={t("把长度、横截面积和材料性质分开，一次改变一个量，观察 R = ρL/A。", "Separate length, cross-sectional area and material properties. Change one variable to test R = ρL/A.")}
    readouts={[{ label: t("当前电阻", "Resistance"), value: format(r.resistance), unit: "Ω" }, { label: t("当前电阻率", "Resistivity at T"), value: format(r.resistivity), unit: "μΩ·m" }, { label: t("圆线直径", "Circular wire diameter"), value: format(r.diameterMM), unit: "mm" }, { label: t("相对20°C变化", "Change from 20°C"), value: `${r.temperatureChangePercent >= 0 ? "+" : ""}${format(r.temperatureChangePercent)}`, unit: "%" }]}
    controls={<>
      <SegmentedControl label={t("观察", "View")} value={config.view} options={[["geometry", t("导线形状", "Wire")], ["length", t("长度关系", "Length")], ["area", t("面积关系", "Area")], ["temperature", t("温度关系", "Temperature")]]} onChange={(v) => set("view", v)} />
      <SliderRow label={t("20°C电阻率", "Resistivity at 20°C")} min={0.01} max={2} step={0.001} value={config.resistivityMicroOhmM} unit="μΩ·m" onChange={(v) => set("resistivityMicroOhmM", v)} />
      <SliderRow label={t("导线长度", "Wire length")} min={0.1} max={20} step={0.1} value={config.lengthM} unit="m" onChange={(v) => set("lengthM", v)} />
      <SliderRow label={t("横截面积", "Cross-sectional area")} min={0.05} max={10} step={0.05} value={config.areaMM2} unit="mm²" onChange={(v) => set("areaMM2", v)} />
      <SliderRow label={t("导线温度", "Wire temperature")} min={-20} max={150} step={1} value={config.temperatureC} unit="°C" onChange={(v) => set("temperatureC", v)} />
      <SliderRow label={t("温度系数 α", "Temperature coefficient α")} min={0} max={0.006} step={0.0001} value={config.temperatureCoefficient} unit="/°C" onChange={(v) => set("temperatureCoefficient", v)} />
    </>}
    explanation={<>{t("均匀导线：长度加倍，电阻加倍；截面积加倍，电阻减半。面积不能当作直径，圆截面满足 A = πd²/4。", "For a uniform wire, doubling length doubles resistance; doubling area halves it. Area is not diameter: A = πd²/4.")}<br />ρ(T) = ρ₂₀[1 + α(T − 20°C)] · {t("温度是外部给定的线性近似，不计算自发热和热膨胀。图中长度与粗细为示意比例；材料参数为可调教学数值。", "Temperature is prescribed using a linear approximation; self-heating and thermal expansion are excluded. Wire dimensions are schematic and material values are adjustable teaching examples.")}</>}>
    {graph ? <CartesianPlot xMin={xMin} xMax={xMax} yMin={0} yMax={yMax} xLabel={xLabel} yLabel="R / Ω" label={t("保持其他变量不变的电阻关系图", "Resistance curve with other variables held constant")}>
      <path d={curvePath(resistanceAt, xMin, xMax, 0, yMax, 500)} fill="none" stroke={C.accent} strokeWidth={3} />
      <line x1={p.x(config[varying])} x2={p.x(config[varying])} y1={p.y(0)} y2={p.y(r.resistance)} stroke={C.series2} strokeDasharray="5 5" />
      <circle cx={p.x(config[varying])} cy={p.y(r.resistance)} r={6} fill={C.series2} stroke={C.surface} strokeWidth={2} />
    </CartesianPlot> : <svg viewBox="0 0 680 340" role="img" aria-label={t("均匀圆截面导线、长度与截面积", "Uniform circular wire, length and cross-sectional area")} style={{ width: "100%", display: "block" }}>
      <path d={`M${left},${166-radius}H${right}V${166+radius}H${left}Z`} fill={C.series1} fillOpacity={0.14} stroke={C.series1} strokeWidth={2} />
      <ellipse cx={left} cy={166} rx={radius * 0.32} ry={radius} fill={C.surfaceSoft} stroke={C.series1} strokeWidth={2} />
      <ellipse cx={right} cy={166} rx={radius * 0.32} ry={radius} fill={C.surface} stroke={C.accent} strokeWidth={3} />
      <path d={`M${left},90V74H${right}V90`} fill="none" stroke={C.muted} strokeWidth={1.5} />
      <text x={340} y={57} textAnchor="middle" fill={C.ink} fontSize={17}>L = {format(config.lengthM)} m</text>
      <text x={340} y={270} textAnchor="middle" fill={C.accent} fontSize={18}>A = {format(config.areaMM2)} mm²</text>
      <text x={340} y={314} textAnchor="middle" fill={C.muted} fontSize={15}>R = ρ(T) × L / A</text>
    </svg>}
  </SceneFrame>;
}
