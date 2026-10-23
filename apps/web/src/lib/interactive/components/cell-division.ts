import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { division: z.enum(["mitosis", "meiosis"]), stage: z.number().int().min(0).max(5), homologPairs: z.number().int().min(1).max(3), showLabels: z.boolean() };
export const CellDivisionConfigSchema = z.object({ division: fields.division.default("mitosis"), stage: fields.stage.default(2), homologPairs: fields.homologPairs.default(2), showLabels: fields.showLabels.default(true) }).strict();
export const CellDivisionPatchSchema = z.object(fields).partial().strict();
export type CellDivisionConfig = z.infer<typeof CellDivisionConfigSchema>;
export const DEFAULT_CELL_DIVISION_CONFIG = CellDivisionConfigSchema.parse({});

export function computeCellDivision(config: CellDivisionConfig) {
  const { stage, homologPairs: n, division } = config;
  if (division === "mitosis") {
    const cells = stage >= 4 ? 2 : 1;
    const chromosomesPerCell = stage === 3 ? 4 * n : 2 * n;
    const dnaC = stage === 0 || stage >= 4 ? 2 : 4;
    return { cells, chromosomesPerCell, chromatidsPerCell: dnaC * n, dnaC, duplicated: stage === 1 || stage === 2, separated: stage === 3, n, totalDNA: cells * dnaC };
  }
  const cells = stage === 5 ? 4 : stage >= 3 ? 2 : 1;
  const chromosomesPerCell = stage >= 3 ? n : 2 * n;
  const dnaC = stage === 0 || stage === 3 || stage === 4 ? 2 : stage === 5 ? 1 : 4;
  return { cells, chromosomesPerCell, chromatidsPerCell: dnaC * n, dnaC, duplicated: stage >= 1 && stage <= 4, separated: false, n, totalDNA: cells * dnaC };
}

export const cellDivisionComponent: ImplementedComponent = {
  implemented: true, componentId: "biology.cell-division", name: "有丝分裂与减数分裂", catalogDescription: "染色体与DNA计数、同源分离和姐妹染色单体分离",
  configSchema: CellDivisionConfigSchema, patchSchema: CellDivisionPatchSchema,
  schemaDoc: "biology.cell-division config：division=mitosis|meiosis 默认mitosis；stage [0,5]整数 默认2；homologPairs [1,3]整数 默认2；showLabels 默认true。阶段为离散关键状态，不是持续动画；C为单倍体DNA含量单位，染色体按着丝粒计数；不演示交叉互换。",
  patchHints: "有丝stage0复制前/1复制后/2中期/3后期/4胞质分裂/5子细胞；减数stage0复制前/1复制后/2中期I/3减数I后/4中期II/5减数II后。DNA复制不使染色体数加倍。",
};
