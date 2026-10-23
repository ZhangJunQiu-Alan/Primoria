"use client";

import { computeIdealGas, type IdealGasConfig } from "@/lib/interactive/components/ideal-gas";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function IdealGasWidget({ config, onChange }: { config: IdealGasConfig; onChange: (next: IdealGasConfig) => void }) {
  const t = useSceneLocale();
  const r = computeIdealGas(config);
  const isothermal = config.mode === "isothermal";
  const xmin = isothermal ? Math.max(0.5, config.volumeL / 3) : 100;
  const xmax = isothermal ? Math.min(50, Math.max(3, config.volumeL * 2)) : 1000;
  const ymax = (isothermal ? r.pressureAtVolume(xmin) : r.pressureAtTemperature(xmax)) * 1.1;
  const p = plotCoordinates(xmin, xmax, 0, ymax);
  const set = <K extends keyof IdealGasConfig>(key: K, value: IdealGasConfig[K]) => onChange({ ...config, [key]: value });
  return <SceneFrame id="chem.ideal-gas" title={t("把微观运动连接到压强", "Connect molecular motion to pressure")} description={isothermal ? t("本条曲线保持温度和物质的量不变；体积越小，压强越大。", "This curve holds temperature and amount fixed: smaller volume produces higher pressure.") : t("本条曲线保持体积和物质的量不变；压强与绝对温度成正比。", "This curve holds volume and amount fixed: pressure is proportional to absolute temperature.")}
    readouts={[{ label: t("压强", "Pressure"), value: r.pressureKPa.toFixed(2), unit: "kPa" }, { label: t("方均根速率", "RMS molecular speed"), value: r.rmsSpeed.toFixed(1), unit: "m/s" }, { label: "PV / nT", value: (r.pressureKPa * config.volumeL / config.amountMol / config.temperatureK).toFixed(4), unit: "J/(mol·K)" }]}
    controls={<>
      <SegmentedControl label={t("过程", "Process")} value={config.mode} options={[["isothermal", t("等温 P–V", "Isothermal P–V")], ["isochoric", t("等容 P–T", "Isochoric P–T")]]} onChange={(v) => set("mode", v)} />
      <SliderRow label={t("绝对温度", "Temperature")} min={100} max={1000} step={1} value={config.temperatureK} unit="K" onChange={(v) => set("temperatureK", v)} />
      <SliderRow label={t("体积", "Volume")} min={0.5} max={50} step={0.5} value={config.volumeL} unit="L" onChange={(v) => set("volumeL", v)} />
      <SliderRow label={t("物质的量", "Amount")} min={0.1} max={3} step={0.1} value={config.amountMol} unit="mol" onChange={(v) => set("amountMol", v)} />
      <SegmentedControl label={t("气体", "Gas")} value={config.gas} options={[["helium", "He"], ["nitrogen", "N₂"], ["oxygen", "O₂"]]} onChange={(v) => set("gas", v)} />
    </>}
    explanation={t("PV = nRT。这里 1 kPa·L = 1 J，温度使用 K。方均根速率是分子速率分布的统计量，不表示所有分子同速；理想气体模型忽略分子体积与相互作用，不用于预测凝结。", "PV = nRT, with 1 kPa·L = 1 J and temperature in kelvin. RMS speed is a distribution statistic, not one speed shared by all molecules. The ideal model omits molecular volume and interactions, so it cannot predict condensation.")}>
    <CartesianPlot xMin={xmin} xMax={xmax} yMin={0} yMax={ymax} xLabel={isothermal ? "V / L" : "T / K"} yLabel="P / kPa" label={isothermal ? t("等温压强体积曲线", "Isothermal pressure-volume curve") : t("等容压强温度曲线", "Isochoric pressure-temperature curve")}>
      <path d={curvePath(isothermal ? r.pressureAtVolume : r.pressureAtTemperature, xmin, xmax, 0, ymax)} fill="none" stroke={C.series2} strokeWidth={3} />
      <circle cx={p.x(isothermal ? config.volumeL : config.temperatureK)} cy={p.y(r.pressureKPa)} r={6} fill={C.series1} stroke={C.surface} strokeWidth={2} />
    </CartesianPlot>
  </SceneFrame>;
}
