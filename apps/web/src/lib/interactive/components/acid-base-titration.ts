import { z } from "zod";
import type { ImplementedComponent } from "./types";

const indicatorSchema = z.enum(["phenolphthalein", "methyl-orange", "none"]);

export const AcidBaseTitrationConfigSchema = z.object({
  acidConcentration: z.number().min(0.01).max(0.5).default(0.1),
  acidVolume: z.number().min(10).max(50).default(25),
  baseConcentration: z.number().min(0.01).max(0.5).default(0.1),
  addedBaseVolume: z.number().min(0).max(100).default(0),
  indicator: indicatorSchema.default("phenolphthalein"),
});

export type AcidBaseTitrationConfig = z.infer<typeof AcidBaseTitrationConfigSchema>;
export const AcidBaseTitrationPatchSchema = z.object({
  acidConcentration: z.number().min(0.01).max(0.5),
  acidVolume: z.number().min(10).max(50),
  baseConcentration: z.number().min(0.01).max(0.5),
  addedBaseVolume: z.number().min(0).max(100),
  indicator: indicatorSchema,
}).partial();
export const DEFAULT_ACID_BASE_TITRATION_CONFIG = AcidBaseTitrationConfigSchema.parse({});

export function computeTitration(config: Pick<AcidBaseTitrationConfig, "acidConcentration" | "acidVolume" | "baseConcentration" | "addedBaseVolume">) {
  const acidMoles = config.acidConcentration * config.acidVolume / 1000;
  const baseMoles = config.baseConcentration * config.addedBaseVolume / 1000;
  const totalVolumeL = (config.acidVolume + config.addedBaseVolume) / 1000;
  const difference = acidMoles - baseMoles;
  const equivalenceVolume = acidMoles / config.baseConcentration * 1000;
  if (Math.abs(difference) < 1e-12) return { pH: 7, equivalenceVolume, state: "equivalence" as const };
  if (difference > 0) return { pH: -Math.log10(difference / totalVolumeL), equivalenceVolume, state: "acidic" as const };
  const pOH = -Math.log10(-difference / totalVolumeL);
  return { pH: 14 - pOH, equivalenceVolume, state: "basic" as const };
}

export const acidBaseTitrationComponent: ImplementedComponent = {
  implemented: true,
  componentId: "chem.acid-base-titration",
  name: "强酸强碱滴定",
  catalogDescription: "强酸强碱滴定曲线、等当点与指示剂变色区间",
  configSchema: AcidBaseTitrationConfigSchema,
  patchSchema: AcidBaseTitrationPatchSchema,
  schemaDoc: `chem.acid-base-titration 的 config 字段(全部字段都有默认值,只写有把握的字段):
- acidConcentration: 盐酸浓度,mol/L,[0.01,0.5],默认 0.1
- acidVolume: 锥形瓶中盐酸体积,mL,[10,50],默认 25
- baseConcentration: 滴定用 NaOH 浓度,mol/L,[0.01,0.5],默认 0.1
- addedBaseVolume: 已加入的 NaOH 体积,mL,[0,100],默认 0
- indicator: 指示剂,"phenolphthalein"(酚酞)|"methyl-orange"(甲基橙)|"none",默认 "phenolphthalein"`,
  patchHints: `「加一滴」表示 addedBaseVolume 增加 0.1;「滴到终点/等当点」按物质的量守恒计算体积(acidConcentration×acidVolume÷baseConcentration);「多加一些碱」在当前值上约 +30%。`,
};
