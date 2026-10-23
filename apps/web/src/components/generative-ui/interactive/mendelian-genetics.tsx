"use client";

import { computeMendelianCross, type MendelianGeneticsConfig } from "@/lib/interactive/components/mendelian-genetics";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function MendelianGeneticsWidget({ config, onChange }: { config: MendelianGeneticsConfig; onChange: (next: MendelianGeneticsConfig) => void }) {
  const t = useSceneLocale();
  const r = computeMendelianCross(config);
  const set = <K extends keyof MendelianGeneticsConfig>(key: K, value: MendelianGeneticsConfig[K]) => onChange({ ...config, [key]: value });
  const colors = { AA: C.series1, Aa: C.accent, aa: C.series2 };
  const phenotype = (g: "AA" | "Aa" | "aa") => config.dominance === "incomplete" && g === "Aa" ? t("中间型", "Intermediate") : g === "aa" ? t("隐性型", "Recessive") : t("显性型", "Dominant");
  return <SceneFrame id="biology.mendelian-genetics" title={t("从配子到下一代", "From gametes to offspring")} description={t("每个格子表示一次等概率配子组合。基因型与表现型是两个不同层次。", "Each cell represents an equally likely gamete pairing. Genotype and phenotype describe different things.")}
    readouts={(["AA", "Aa", "aa"] as const).map((g) => ({ label: `${g} · ${phenotype(g)}`, value: `${r.probabilities[g] * 100}%` }))}
    controls={<>
      <SegmentedControl label={t("亲本一", "Parent 1")} value={config.parent1} options={[["AA", "AA"], ["Aa", "Aa"], ["aa", "aa"]]} onChange={(v) => set("parent1", v)} />
      <SegmentedControl label={t("亲本二", "Parent 2")} value={config.parent2} options={[["AA", "AA"], ["Aa", "Aa"], ["aa", "aa"]]} onChange={(v) => set("parent2", v)} />
      <SegmentedControl label={t("显性关系", "Dominance")} value={config.dominance} options={[["complete", t("完全显性", "Complete")], ["incomplete", t("不完全显性", "Incomplete")]]} onChange={(v) => set("dominance", v)} />
      <SegmentedControl label={t("观察", "View")} value={config.view} options={[["punnett", t("棋盘格", "Punnett square")], ["distribution", t("概率分布", "Distribution")]]} onChange={(v) => set("view", v)} />
      <label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showGametes} onChange={(e) => set("showGametes", e.target.checked)} /> {t("标注配子", "Label gametes")}</label>
    </>}
    explanation={t("减数分裂使一对等位基因分离，受精时重新组合。棋盘格给出理论概率，并不保证每四个子代恰好各落入一个格子。这里只讨论单个位点，不涉及连锁、性连锁或不完全外显。", "Alleles segregate during meiosis and combine at fertilization. The square gives theoretical probabilities, not a guarantee for each group of four offspring. This model excludes linkage, sex linkage and incomplete penetrance.")}>
    <svg viewBox="0 0 680 340" role="img" aria-label={`${config.parent1} × ${config.parent2}`} style={{ width: "100%", display: "block" }}>
      {config.view === "punnett" ? <>
        <text x={155} y={52} fill={C.muted} textAnchor="middle" fontSize={14}>{config.parent1}</text><text x={360} y={30} fill={C.muted} textAnchor="middle" fontSize={14}>{config.parent2}</text>
        {config.showGametes ? <>{r.gametes2.map((g, i) => <text key={`t${i}`} x={300 + i * 150} y={66} fill={C.ink} textAnchor="middle" fontSize={22}>{g}</text>)}{r.gametes1.map((g, i) => <text key={`l${i}`} x={195} y={140 + i * 110} fill={C.ink} textAnchor="middle" fontSize={22}>{g}</text>)}</> : null}
        {r.cells.map((cell, i) => <g key={i}><rect x={230 + cell.col * 150} y={85 + cell.row * 110} width={140} height={100} rx={12} fill={colors[cell.genotype]} fillOpacity={0.1} stroke={colors[cell.genotype]} strokeOpacity={0.5} /><text x={300 + cell.col * 150} y={116 + cell.row * 110} textAnchor="middle" fontSize={27} fontWeight={650} fill={colors[cell.genotype]}>{cell.genotype}</text><text x={300 + cell.col * 150} y={147 + cell.row * 110} textAnchor="middle" fontSize={12} fill={C.muted}><tspan x={300 + cell.col * 150}>{phenotype(cell.genotype)}</tspan><tspan x={300 + cell.col * 150} dy={30}>25%</tspan></text></g>)}
      </> : (["AA", "Aa", "aa"] as const).map((g, i) => <g key={g}><line x1={118} x2={610} y1={80 + i * 92} y2={80 + i * 92} stroke={C.line} strokeWidth={30} /><line x1={118} x2={118 + 492 * r.probabilities[g]} y1={80 + i * 92} y2={80 + i * 92} stroke={colors[g]} strokeWidth={30} /><text x={90} y={86 + i * 92} textAnchor="end" fontSize={18} fill={C.ink}>{g}</text><text x={118} y={114 + i * 92} fill={C.muted} fontSize={12}>{phenotype(g)} · {r.probabilities[g] * 100}%</text></g>)}
    </svg>
  </SceneFrame>;
}
