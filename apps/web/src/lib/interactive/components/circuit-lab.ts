import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { voltage: z.number().min(0).max(24), resistance1: z.number().min(1).max(1000), resistance2: z.number().min(1).max(1000),
  topology: z.enum(["series", "parallel"]), switchClosed: z.boolean(), showCurrent: z.boolean() };
export const CircuitLabConfigSchema = z.object({ voltage: fields.voltage.default(6), resistance1: fields.resistance1.default(100), resistance2: fields.resistance2.default(200), topology: fields.topology.default("series"), switchClosed: fields.switchClosed.default(true), showCurrent: fields.showCurrent.default(true) }).strict();
export const CircuitLabPatchSchema = z.object(fields).partial().strict();
export type CircuitLabConfig = z.infer<typeof CircuitLabConfigSchema>;
export const DEFAULT_CIRCUIT_LAB_CONFIG = CircuitLabConfigSchema.parse({});

export function computeCircuit(config: CircuitLabConfig) {
  const { voltage: v, resistance1: r1, resistance2: r2, topology, switchClosed } = config;
  const networkResistance = topology === "series" ? r1 + r2 : r1 * r2 / (r1 + r2);
  const current = switchClosed ? v / networkResistance : 0;
  const current1 = topology === "series" ? current : switchClosed ? v / r1 : 0;
  const current2 = topology === "series" ? current : switchClosed ? v / r2 : 0;
  return { networkResistance, equivalentResistance: switchClosed ? networkResistance : null, current, current1, current2,
    voltage1: current1 * r1, voltage2: current2 * r2, power: v * current, power1: current1 ** 2 * r1, power2: current2 ** 2 * r2 };
}

export const circuitLabComponent: ImplementedComponent = {
  implemented: true, componentId: "physics.circuit-lab", name: "串并联电路实验室", catalogDescription: "欧姆定律、串并联分流分压、电功率和开关",
  configSchema: CircuitLabConfigSchema, patchSchema: CircuitLabPatchSchema,
  schemaDoc: `physics.circuit-lab config：voltage 电源[0,24]V 默认6；resistance1/resistance2 各[1,1000]Ω 默认100/200；topology=series|parallel 默认series；switchClosed 默认true；showCurrent 默认true。理想直流电源、导线和电阻，不模拟电池内阻、电容或短路。`,
  patchHints: "串联电流相同且电压相加；并联电压相同且总电流为支路之和。开关断开时没有电流，避免将断路误当成零电阻。",
};
