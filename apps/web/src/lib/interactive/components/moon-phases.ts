import { z } from "zod";
import type { ImplementedComponent } from "./types";

export const SYNODIC_MONTH = 29.53059;
const fields = { day: z.number().min(0).max(SYNODIC_MONTH), hemisphere: z.enum(["north", "south"]), view: z.enum(["orbit", "appearance"]), showLabels: z.boolean() };
export const MoonPhasesConfigSchema = z.object({ day: fields.day.default(7.3826475), hemisphere: fields.hemisphere.default("north"), view: fields.view.default("orbit"), showLabels: fields.showLabels.default(true) }).strict();
export const MoonPhasesPatchSchema = z.object(fields).partial().strict();
export type MoonPhasesConfig = z.infer<typeof MoonPhasesConfigSchema>;
export const DEFAULT_MOON_PHASES_CONFIG = MoonPhasesConfigSchema.parse({});

export function computeMoonPhase(config: MoonPhasesConfig) {
  const angle = config.day / SYNODIC_MONTH * 2 * Math.PI;
  const waxing = config.day < SYNODIC_MONTH / 2;
  const side = (waxing ? 1 : -1) * (config.hemisphere === "north" ? 1 : -1);
  const outline: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 64; i++) { const y = -1 + 2 * i / 64; outline.push({ x: side * Math.sqrt(Math.max(0, 1 - y * y)), y }); }
  for (let i = 64; i >= 0; i--) { const y = -1 + 2 * i / 64; outline.push({ x: side * Math.cos(angle) * Math.sqrt(Math.max(0, 1 - y * y)), y }); }
  return { angle, waxing, illuminatedFraction: (1 - Math.cos(angle)) / 2, phaseIndex: Math.round(config.day / SYNODIC_MONTH * 8) % 8, outline };
}

export const moonPhasesComponent: ImplementedComponent = {
  implemented: true, componentId: "astronomy.moon-phases", name: "月相变化与日地月位置", catalogDescription: "月相圆盘、八个月相与日地月位置联动",
  configSchema: MoonPhasesConfigSchema, patchSchema: MoonPhasesPatchSchema,
  schemaDoc: `astronomy.moon-phases config：day 从新月算起 [0,29.53059]天，默认7.3826475；hemisphere=north|south 默认north，改变观测朝向；view=orbit|appearance 默认orbit；showLabels 默认true。采用圆轨道/平行太阳光模型，展示朔望月，不模拟日月食或月球天平动。`,
  patchHints: "新月 day=0；上弦=7.3826475；满月=14.765295；下弦=22.1479425。南北半球改变亮面方向，不改变照明比例。",
};
