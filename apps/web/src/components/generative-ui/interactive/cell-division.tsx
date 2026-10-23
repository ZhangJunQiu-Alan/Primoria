"use client";

import { computeCellDivision, type CellDivisionConfig } from "@/lib/interactive/components/cell-division";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function CellDivisionWidget({ config, onChange }: { config: CellDivisionConfig; onChange: (next: CellDivisionConfig) => void }) {
  const t = useSceneLocale(), r = computeCellDivision(config);
  const mitosis = config.division === "mitosis";
  const labels = (mitosis ? t("复制前,复制后,有丝中期,有丝后期,胞质分裂后,子细胞", "Before S phase,After replication,Metaphase,Anaphase,After cytokinesis,Daughter cells") : t("复制前,复制后,中期I,减数I后,中期II,减数II后", "Before S phase,After replication,Metaphase I,After meiosis I,Metaphase II,After meiosis II")).split(",");
  const set = <K extends keyof CellDivisionConfig>(key: K, value: CellDivisionConfig[K]) => onChange({ ...config, [key]: value });
  return <SceneFrame id="biology.cell-division" title={t("复制的是DNA，还是染色体数？", "DNA copies, but what happens to chromosome counts?")} description={t("用着丝粒计数染色体，分别追踪每个细胞内的DNA含量与细胞数量。颜色表示同源来源，不代表不同基因数量。", "Count chromosomes by centromeres, and track DNA per cell separately from cell count. Colors indicate homolog origin.")}
    readouts={[{ label: t("细胞数", "Cells"), value: r.cells }, { label: t("每细胞染色体数", "Chromosomes per cell"), value: r.chromosomesPerCell }, { label: t("每细胞DNA", "DNA per cell"), value: `${r.dnaC} C` }, { label: t("阶段", "Stage"), value: labels[config.stage] }]}
    controls={<><SegmentedControl label={t("分裂方式", "Division")} value={config.division} options={[["mitosis", t("有丝分裂", "Mitosis")], ["meiosis", t("减数分裂", "Meiosis")]]} onChange={(v) => set("division", v)} /><SliderRow label={t("关键阶段", "Stage")} min={0} max={5} step={1} value={config.stage} onChange={(v) => set("stage", v)} /><SliderRow label={t("同源对数", "Homolog pairs")} min={1} max={3} step={1} value={config.homologPairs} onChange={(v) => set("homologPairs", v)} /><label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showLabels} onChange={(e) => set("showLabels", e.target.checked)} />{t("标注细胞", "Label cells")}</label></>}
    explanation={mitosis && config.stage === 3 ? t("有丝分裂后期着丝粒分离，尚未分成两个细胞，因此单个细胞的染色体计数暂时加倍；每极仍分到原来的2n。DNA总量没有再次复制。不能因此把稳定子细胞称为四倍体。", "During anaphase centromeres separate before cytokinesis, temporarily doubling the chromosome count in one cell. Each pole receives 2n, without another DNA replication. Daughter cells are not thereby tetraploid.") : t("复制前为2n、2C；复制后仍是2n，但DNA为4C。有丝分裂产生两个2n、2C子细胞；减数I分开同源染色体，减数II分开姐妹染色单体，最终四个n、1C细胞。此图只展示一种可能的分配，不含交叉互换。", "Before replication: 2n, 2C; after replication: 2n, 4C. Mitosis yields two 2n, 2C cells. Meiosis I separates homologs and meiosis II separates sisters, yielding four n, 1C cells. One possible assortment is illustrated, without crossing over.")}>
    <svg viewBox="0 0 680 320" role="img" aria-label={`${labels[config.stage]} ${r.cells} cells, ${r.chromosomesPerCell} chromosomes/cell`} style={{ width: "100%", display: "block" }}>
      {Array.from({ length: r.cells }, (_, cell) => {
        const cellWidth = r.cells === 1 ? 280 : r.cells === 2 ? 240 : 145, cx = r.cells === 1 ? 340 : r.cells === 2 ? 195 + cell * 290 : 107 + cell * 155;
        return <g key={cell}><ellipse cx={cx} cy={150} rx={cellWidth / 2} ry={110} fill={C.accentSoft} fillOpacity={0.5} stroke={C.accent} strokeWidth={2} />{Array.from({ length: r.chromosomesPerCell }, (_, i) => {
          const fromFirst = !mitosis && config.stage >= 3 ? cell < r.cells / 2 : i % 2 === 0;
          const tone = fromFirst ? C.series1 : C.series2;
          const columns = r.separated ? r.chromosomesPerCell / 2 : Math.min(3, r.chromosomesPerCell);
          const group = r.separated ? Math.floor(i / columns) : 0;
          const x = r.separated ? cx + (group ? 1 : -1) * 62 + ((i % columns) % 2 - 0.5) * 18 : cx + (i % columns - (columns - 1) / 2) * 32;
          const y = r.separated ? 105 + Math.floor((i % columns) / 2) * 36 : 120 + Math.floor(i / columns) * 48;
          return <g key={i}><path d={r.duplicated ? `M${x - 10},${y - 15}L${x + 10},${y + 15}M${x + 10},${y - 15}L${x - 10},${y + 15}` : `M${x},${y - 15}L${x},${y + 15}`} stroke={tone} strokeWidth={5} strokeLinecap="round" /><circle cx={x} cy={y} r={3} fill={C.ink} /></g>;
        })}{config.showLabels ? <text x={cx} y={286} textAnchor="middle" fill={C.muted} fontSize={13}>{t("细胞", "Cell")} {cell + 1} · {r.dnaC}C</text> : null}</g>;
      })}
    </svg>
  </SceneFrame>;
}
