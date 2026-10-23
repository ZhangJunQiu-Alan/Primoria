import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { molecule: z.enum(["CO2", "BF3", "CH4", "NH3", "H2O", "PCl5", "SF6"]), mode: z.enum(["ball-stick", "electron-domains"]), showAngles: z.boolean() };
export const MolecularGeometryConfigSchema = z.object({ molecule: fields.molecule.default("CH4"), mode: fields.mode.default("ball-stick"), showAngles: fields.showAngles.default(true) }).strict();
export const MolecularGeometryPatchSchema = z.object(fields).partial().strict();
export type MolecularGeometryConfig = z.infer<typeof MolecularGeometryConfigSchema>;
export type SpatialVector = readonly [number, number, number];
export const DEFAULT_MOLECULAR_GEOMETRY_CONFIG = MolecularGeometryConfigSchema.parse({});

function cone(count: number, z: number): SpatialVector[] {
  return Array.from({ length: count }, (_, i) => { const a = i * 2 * Math.PI / count; return [Math.sqrt(1 - z * z) * Math.cos(a), Math.sqrt(1 - z * z) * Math.sin(a), z]; });
}

export function getMolecularGeometry(molecule: MolecularGeometryConfig["molecule"]) {
  const tetra: SpatialVector[] = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(([x, y, z]) => [x / Math.sqrt(3), y / Math.sqrt(3), z / Math.sqrt(3)]);
  const waterAngle = 104.5 * Math.PI / 360;
  const models: Record<MolecularGeometryConfig["molecule"], { center: string; outer: string; geometry: string; geometryEn: string; angles: number[]; bonds: SpatialVector[]; lonePairs: SpatialVector[] }> = {
    CO2: { center: "C", outer: "O", geometry: "直线形", geometryEn: "Linear", angles: [180], bonds: [[-1, 0, 0], [1, 0, 0]], lonePairs: [] },
    BF3: { center: "B", outer: "F", geometry: "平面三角形", geometryEn: "Trigonal planar", angles: [120], bonds: cone(3, 0), lonePairs: [] },
    CH4: { center: "C", outer: "H", geometry: "正四面体", geometryEn: "Tetrahedral", angles: [Math.acos(-1 / 3) * 180 / Math.PI], bonds: tetra, lonePairs: [] },
    NH3: { center: "N", outer: "H", geometry: "三角锥形", geometryEn: "Trigonal pyramidal", angles: [107], bonds: cone(3, -Math.sqrt((Math.cos(107 * Math.PI / 180) + 0.5) / 1.5)), lonePairs: [[0, 0, 1]] },
    H2O: { center: "O", outer: "H", geometry: "折线形", geometryEn: "Bent", angles: [104.5], bonds: [[Math.sin(waterAngle), 0, Math.cos(waterAngle)], [-Math.sin(waterAngle), 0, Math.cos(waterAngle)]], lonePairs: [[0, 0.8, -0.6], [0, -0.8, -0.6]] },
    PCl5: { center: "P", outer: "Cl", geometry: "三角双锥", geometryEn: "Trigonal bipyramidal", angles: [90, 120, 180], bonds: [...cone(3, 0), [0, 0, 1], [0, 0, -1]], lonePairs: [] },
    SF6: { center: "S", outer: "F", geometry: "正八面体", geometryEn: "Octahedral", angles: [90, 180], bonds: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], lonePairs: [] },
  };
  return { ...models[molecule], bondOrder: molecule === "CO2" ? 2 : 1 };
}

export function projectMoleculeVector(vector: SpatialVector, yaw: number, pitch: number) {
  const [x, y, z] = vector;
  const rx = x * Math.cos(yaw) + z * Math.sin(yaw), rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const ry = y * Math.cos(pitch) - rz * Math.sin(pitch), depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
  const perspective = 3.5 / (3.5 - depth);
  return { x: rx * perspective, y: ry * perspective, depth, perspective };
}

export const molecularGeometryComponent: ImplementedComponent = {
  implemented: true, componentId: "chem.molecular-geometry", name: "分子空间构型", catalogDescription: "七种典型分子、VSEPR构型、孤电子对与键角",
  configSchema: MolecularGeometryConfigSchema, patchSchema: MolecularGeometryPatchSchema,
  schemaDoc: `chem.molecular-geometry config：molecule=CO2|BF3|CH4|NH3|H2O|PCl5|SF6 默认CH4；mode=ball-stick|electron-domains 默认ball-stick；showAngles 默认true。可本地旋转观察；键长、原子半径与电子云为示意，NH3/H2O采用约107°/104.5°。不模拟量子轨道或真实电子密度。`,
  patchHints: "区分电子域几何与分子几何；CO2的双键各算一个电子域。相机拖动只改变本地视角，不修改教学config。",
};
