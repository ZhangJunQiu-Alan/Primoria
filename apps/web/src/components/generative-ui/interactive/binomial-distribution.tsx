"use client";

import { computeBinomial, type BinomialDistributionConfig } from "@/lib/interactive/components/binomial-distribution";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function BinomialDistributionWidget({ config, onChange }: { config: BinomialDistributionConfig; onChange: (next: BinomialDistributionConfig) => void }) {
  const t = useSceneLocale(), r = computeBinomial(config), cdf = config.view === "cdf";
  const ymax = cdf ? 1.1 : Math.max(...r.outcomes.map((v) => v.probability)) * 1.15;
  const p = plotCoordinates(-0.5, config.trials + 0.5, 0, ymax);
  const set = <K extends keyof BinomialDistributionConfig>(key: K, value: BinomialDistributionConfig[K]) => onChange({ ...config, [key]: value });
  const symbol = config.event === "exact" ? "=" : config.event === "at-most" ? "≤" : "≥";
  return <SceneFrame id="math.binomial-distribution" title={t("重复试验，成功几次？", "How many successes in repeated trials?")} description={t("每次成功概率固定、各次独立。高亮柱子的概率相加就是选中事件的概率。", "Trials are independent with the same success probability. Add the highlighted bars to obtain the selected event probability.")}
    readouts={[{ label: `P(X ${symbol} ${config.threshold})`, value: `${(r.eventProbability * 100).toFixed(3)}%` }, { label: "E(X) = np", value: r.mean.toFixed(3) }, { label: "Var(X)", value: r.variance.toFixed(3) }, { label: "σ", value: r.standardDeviation.toFixed(3) }]}
    controls={<><SliderRow label={t("试验次数", "Trials")} min={1} max={40} step={1} value={config.trials} onChange={(v) => set("trials", v)} /><SliderRow label={t("成功概率", "Success p")} min={0} max={1} step={0.01} value={config.successProbability} onChange={(v) => set("successProbability", v)} /><SliderRow label={t("次数阈值", "Threshold")} min={0} max={40} step={1} value={config.threshold} onChange={(v) => set("threshold", v)} /><SegmentedControl label={t("事件", "Event")} value={config.event} options={[["exact", t("恰好", "Exactly")], ["at-most", t("至多", "At most")], ["at-least", t("至少", "At least")]]} onChange={(v) => set("event", v)} /><SegmentedControl label={t("图像", "Graph")} value={config.view} options={[["pmf", t("概率质量", "PMF")], ["cdf", t("累计概率", "CDF")]]} onChange={(v) => set("view", v)} /></>}
    explanation={t("P(X=k)=C(n,k)pᵏ(1−p)ⁿ⁻ᵏ。期望是大量重复实验的平均值，不要求是整数。累计曲线表示P(X≤k)，即使高亮事件选择“至少”，曲线定义也不改变；该事件概率在读数中另行求和。", "P(X=k)=C(n,k)pᵏ(1−p)ⁿ⁻ᵏ. The mean need not be an integer. The CDF always means P(X≤k), even when the selected event is 'at least'; that event probability is summed separately in the readout.")}>
    <CartesianPlot xMin={-0.5} xMax={config.trials + 0.5} yMin={0} yMax={ymax} xTicks={Array.from({ length: Math.min(config.trials, 5) + 1 }, (_, i) => Math.round(config.trials * i / Math.min(config.trials, 5)))} xLabel={t("成功次数 k", "Successes k")} yLabel={cdf ? "P(X≤k)" : "P(X=k)"} label={t("二项分布柱状图和累计分布", "Binomial probability and cumulative distribution")}>
      {cdf ? r.outcomes.map((v) => <g key={v.k}><path d={`M${p.x(v.k)},${p.y(v.cumulative)}H${p.x(Math.min(config.trials + 0.5, v.k + 1))}`} stroke={C.series2} strokeWidth={3} /><circle cx={p.x(v.k)} cy={p.y(v.cumulative)} r={3} fill={C.series2} /></g>) : r.outcomes.map((v) => <rect key={v.k} x={p.x(v.k - 0.38)} y={p.y(v.probability)} width={p.x(0.38) - p.x(-0.38)} height={p.y(0) - p.y(v.probability)} fill={v.selected ? C.series1 : C.series2} fillOpacity={v.selected ? 0.9 : 0.4}><title>k={v.k}, P={v.probability.toPrecision(5)}</title></rect>)}
    </CartesianPlot>
  </SceneFrame>;
}
