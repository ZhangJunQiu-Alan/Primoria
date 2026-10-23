"use client";

import { computeFractionEquivalence, type FractionEquivalenceConfig } from "@/lib/interactive/components/fraction-equivalence";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function FractionEquivalenceWidget({ config, onChange }: { config: FractionEquivalenceConfig; onChange: (next: FractionEquivalenceConfig) => void }) {
  const t = useSceneLocale();
  const r = computeFractionEquivalence(config);
  const set = <K extends keyof FractionEquivalenceConfig>(key: K, value: FractionEquivalenceConfig[K]) => onChange({ ...config, [key]: value });
  const units = Math.max(1, Math.ceil(r.value));
  const rows = Math.ceil(units / 4);
  const areaHeight = 100 + rows * 120;
  const bar = (unit: number, divisor: number, numerator: number, y: number, tone: string) => Array.from({ length: divisor }, (_, i) => <rect key={`${unit}-${i}-${y}`} x={46 + (unit % 4) * 151 + i / divisor * 134} y={y} width={134 / divisor} height={30} fill={unit * divisor + i < numerator ? tone : C.surfaceSoft} fillOpacity={unit * divisor + i < numerator ? 0.65 : 1} stroke={C.surface} strokeWidth={0.6} />);
  const lineMax = Math.max(1, Math.ceil(r.value));
  return <SceneFrame id="math.fraction-equivalence" title={t("分得更细，大小变了吗？", "More pieces, same amount?")} description={t("每个长条都代表同样大小的一个整体。扩分只改变分割的份数，不改变涂色总量。", "Every bar represents one equal-sized whole. Subdivision changes the piece count, not the total shaded amount.")}
    readouts={[{ label: t("原分数", "Original"), value: `${config.numerator}/${config.denominator}` }, { label: t("等值分数", "Equivalent"), value: `${r.equivalentNumerator}/${r.equivalentDenominator}` }, { label: t("最简分数", "Simplest form"), value: `${r.simplifiedNumerator}/${r.simplifiedDenominator}` }, ...(config.showDecimal ? [{ label: t("数值", "Value"), value: r.value.toFixed(4) }] : [])]}
    controls={<>
      <SliderRow label={t("分子", "Numerator")} min={0} max={12} step={1} value={config.numerator} onChange={(v) => set("numerator", v)} />
      <SliderRow label={t("分母", "Denominator")} min={1} max={12} step={1} value={config.denominator} onChange={(v) => set("denominator", v)} />
      <SliderRow label={t("等分倍数", "Split factor")} min={1} max={6} step={1} value={config.factor} onChange={(v) => set("factor", v)} />
      <SegmentedControl label={t("模型", "Model")} value={config.view} options={[["area", t("面积", "Area")], ["numberline", t("数轴", "Number line")]]} onChange={(v) => set("view", v)} />
      <label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showDecimal} onChange={(e) => set("showDecimal", e.target.checked)} />{t("显示小数", "Show decimal")}</label>
    </>}
    explanation={`${config.numerator}/${config.denominator} = (${config.numerator} × ${config.factor}) / (${config.denominator} × ${config.factor}) = ${r.equivalentNumerator}/${r.equivalentDenominator}。${t("分子比分母大时，图中会显示多个完整整体；不能只把一个整体全部涂满来代替假分数。", "Improper fractions occupy more than one whole. A fully shaded single whole cannot represent an arbitrary improper fraction.")}`}>
    {config.view === "area" ? <svg viewBox={`0 0 680 ${areaHeight}`} role="img" aria-label={`${config.numerator}/${config.denominator} = ${r.equivalentNumerator}/${r.equivalentDenominator}`} style={{ display: "block", width: "100%" }}>
      {Array.from({ length: units }, (_, unit) => <g key={unit}>{bar(unit, config.denominator, config.numerator, 42 + Math.floor(unit / 4) * 120, C.series2)}{bar(unit, r.equivalentDenominator, r.equivalentNumerator, 86 + Math.floor(unit / 4) * 120, C.accent)}<text x={113 + unit % 4 * 151} y={135 + Math.floor(unit / 4) * 120} fill={C.muted} textAnchor="middle" fontSize={11}>{t("整体", "Whole")} {unit + 1}</text></g>)}
    </svg> : <svg viewBox="0 0 680 260" role="img" aria-label={t("等值分数在数轴上重合", "Equivalent fractions coincide on the number line")} style={{ width: "100%", display: "block" }}>
      <line x1={48} x2={635} y1={120} y2={120} stroke={C.muted} strokeWidth={2} />
      {Array.from({ length: 7 }, (_, i) => <g key={i}><line x1={48 + i / 6 * 587} x2={48 + i / 6 * 587} y1={114} y2={126} stroke={C.muted} /><text x={48 + i / 6 * 587} y={148} textAnchor="middle" fill={C.muted} fontSize={12}>{Number((i * lineMax / 6).toFixed(2))}</text></g>)}
      <circle cx={48 + r.value / lineMax * 587} cy={120} r={9} fill={C.series2} /><line x1={48 + r.value / lineMax * 587} x2={48 + r.value / lineMax * 587} y1={74} y2={183} stroke={C.accent} strokeDasharray="4 4" />
      <text x={340} y={52} fill={C.series2} textAnchor="middle" fontSize={22}>{config.numerator}/{config.denominator}</text><text x={340} y={211} fill={C.accent} textAnchor="middle" fontSize={22}>{r.equivalentNumerator}/{r.equivalentDenominator}</text>
    </svg>}
  </SceneFrame>;
}
