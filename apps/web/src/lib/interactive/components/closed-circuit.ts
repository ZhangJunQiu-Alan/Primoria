import { z } from "zod";
import type { ImplementedComponent } from "./types";

const onGrid = (value: number) => Math.abs(value - Math.round(value * 100) / 100) <= Number.EPSILON * Math.abs(value) * 8;
const fields = { emf: z.number().min(0).max(24).multipleOf(0.01).refine(onGrid, "Use increments of 0.01"), internalResistance: z.number().min(0).max(10).multipleOf(0.01).refine(onGrid, "Use increments of 0.01"), loadResistance: z.number().min(0).max(100).multipleOf(0.01).refine(onGrid, "Use increments of 0.01"), switchClosed: z.boolean(), view: z.enum(["circuit", "characteristic", "power"]), showPowerBalance: z.boolean() };
export const ClosedCircuitConfigSchema = z.object({ emf: fields.emf.default(6), internalResistance: fields.internalResistance.default(1), loadResistance: fields.loadResistance.default(5), switchClosed: fields.switchClosed.default(true), view: fields.view.default("circuit"), showPowerBalance: fields.showPowerBalance.default(true) }).strict();
export const ClosedCircuitPatchSchema = z.object(fields).partial().strict();
export type ClosedCircuitConfig = z.infer<typeof ClosedCircuitConfigSchema>;
export const DEFAULT_CLOSED_CIRCUIT_CONFIG = ClosedCircuitConfigSchema.parse({});

export function computeClosedCircuit(config: ClosedCircuitConfig) {
  const { emf: e, internalResistance: r, loadResistance: load } = config;
  const totalResistance = r + load;
  const state = !config.switchClosed ? "open" : totalResistance === 0 ? e === 0 ? "indeterminate" : "ideal-short" : load === 0 ? "short" : "loaded";
  const current = state === "open" ? 0 : totalResistance > 0 ? e / totalResistance : null;
  const terminalVoltage = state === "open" ? e : current === null ? e === 0 ? 0 : null : current * load;
  const loadVoltage = state === "open" ? 0 : terminalVoltage;
  const sourcePower = current === null ? null : e * current;
  const loadPower = current === null ? null : current ** 2 * load;
  const internalPower = current === null ? null : current ** 2 * r;
  return { state, totalResistance, current, terminalVoltage, loadVoltage, sourcePower, loadPower, internalPower,
    efficiency: sourcePower !== null && sourcePower > 0 && loadPower !== null ? loadPower / sourcePower : null,
    matchedResistance: r > 0 ? r : null, maximumLoadPower: r > 0 ? e ** 2 / (4 * r) : e === 0 ? 0 : null };
}

export function closedCircuitLoadPower(emf: number, internalResistance: number, loadResistance: number) {
  const total = internalResistance + loadResistance;
  return total > 0 ? emf ** 2 * loadResistance / total ** 2 : null;
}

export const closedCircuitComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.closed-circuit", name: "闭合电路与电源内阻", catalogDescription: "E/(R+r)、路端电压、断路短路、输出功率和最大功率匹配",
  configSchema: ClosedCircuitConfigSchema, patchSchema: ClosedCircuitPatchSchema,
  schemaDoc: "physics.closed-circuit config：emf电动势[0,24]V默认6；internalResistance内阻[0,10]Ω默认1；loadResistance外电阻[0,100]Ω默认5；三个数值均0.01格点；switchClosed默认true；view=circuit|characteristic|power默认circuit；showPowerBalance默认true。恒定电动势+串联内阻+单一等效欧姆负载的稳态直流模型。断路I=0且路端电压E，负载本身电压0；有内阻短路I=E/r；零内阻理想短路无有限稳态，不能显示为0A。",
  patchHints: "最大输出功率在R=r>0，但效率仅50%；高效率不等于最大功率。改变r同时影响U-I斜率和内耗；若r=0，不宣称存在有限的最大输出功率。本组件不做多支路拓扑、电表接法误差、蓄电池化学、自发热温变或RC暂态。",
};
