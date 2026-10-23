import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CellDivisionConfigSchema, computeCellDivision, cellDivisionComponent } from "../src/lib/interactive/components/cell-division";
import { OsmosisLabConfigSchema, computeOsmosis, osmosisLabComponent } from "../src/lib/interactive/components/osmosis-lab";
import { MagneticMotionConfigSchema, computeMagneticMotion, magneticMotionComponent } from "../src/lib/interactive/components/magnetic-motion";
import { PhotoelectricEffectConfigSchema, computePhotoelectric, photoelectricEffectComponent, PHOTON_EV_NM } from "../src/lib/interactive/components/photoelectric-effect";
import { CellDivisionWidget } from "../src/components/generative-ui/interactive/cell-division";
import { OsmosisLabWidget } from "../src/components/generative-ui/interactive/osmosis-lab";
import { MagneticMotionWidget } from "../src/components/generative-ui/interactive/magnetic-motion";
import { PhotoelectricEffectWidget } from "../src/components/generative-ui/interactive/photoelectric-effect";

describe("fifth science batch contracts", () => {
  it.each([cellDivisionComponent, osmosisLabComponent, magneticMotionComponent, photoelectricEffectComponent])("strictly validates $componentId", (entry) => {
    expect(entry.configSchema.safeParse({}).success).toBe(true);
    expect(entry.patchSchema.parse({})).toEqual({});
    expect(entry.configSchema.safeParse({ html: "unsafe" }).success).toBe(false);
    expect(entry.patchSchema.safeParse({ html: "unsafe" }).success).toBe(false);
  });
});

describe("chromosome and DNA counting", () => {
  it("does not double chromosomes during DNA replication", () => {
    const before = computeCellDivision(CellDivisionConfigSchema.parse({ stage: 0 }));
    const after = computeCellDivision(CellDivisionConfigSchema.parse({ stage: 1 }));
    expect(before.chromosomesPerCell).toBe(4);
    expect(after.chromosomesPerCell).toBe(4);
    expect(before.dnaC).toBe(2);
    expect(after.dnaC).toBe(4);
  });
  it("separates anaphase centromere counts from stable daughter-cell counts", () => {
    const anaphase = computeCellDivision(CellDivisionConfigSchema.parse({ stage: 3 }));
    expect(anaphase.cells).toBe(1);
    expect(anaphase.chromosomesPerCell).toBe(8);
    const daughter = computeCellDivision(CellDivisionConfigSchema.parse({ stage: 5 }));
    expect(daughter.cells).toBe(2);
    expect(daughter.chromosomesPerCell).toBe(4);
    expect(daughter.dnaC).toBe(2);
  });
  it("conserves replicated DNA across meiosis and produces haploid cells", () => {
    const config = CellDivisionConfigSchema.parse({ division: "meiosis", homologPairs: 3 });
    for (const stage of [1, 2, 3, 4, 5]) expect(computeCellDivision({ ...config, stage }).totalDNA).toBe(4);
    expect(computeCellDivision({ ...config, stage: 3 })).toMatchObject({ cells: 2, chromosomesPerCell: 3, dnaC: 2, duplicated: true });
    expect(computeCellDivision({ ...config, stage: 5 })).toMatchObject({ cells: 4, chromosomesPerCell: 3, dnaC: 1, duplicated: false });
  });
});

describe("osmotic solute conservation", () => {
  it("moves water toward higher solute concentration and conserves each solute amount", () => {
    const config = OsmosisLabConfigSchema.parse({});
    for (const progress of [0, 0.25, 0.75, 1]) {
      const r = computeOsmosis({ ...config, progress });
      expect(r.leftConcentration * r.leftVolume).toBeCloseTo(0.2, 12);
      expect(r.rightConcentration * r.rightVolume).toBeCloseTo(0.6, 12);
      expect(r.leftVolume + r.rightVolume).toBeCloseTo(2, 12);
    }
    expect(computeOsmosis(config).direction).toBe(1);
    const final = computeOsmosis({ ...config, mode: "equilibrium" });
    expect(final.leftVolume).toBeCloseTo(0.5, 12);
    expect(final.rightVolume).toBeCloseTo(1.5, 12);
    expect(final.leftConcentration).toBeCloseTo(final.rightConcentration, 12);
  });
  it("distinguishes pure-water volume depletion from ordinary equilibrium", () => {
    const r = computeOsmosis(OsmosisLabConfigSchema.parse({ leftConcentration: 0, mode: "equilibrium" }));
    expect(r.limitState).toBe(true);
    expect(r.leftVolume).toBe(0);
    expect(Number.isFinite(r.pressureDifferenceKPa)).toBe(true);
    const water = computeOsmosis(OsmosisLabConfigSchema.parse({ leftConcentration: 0, rightConcentration: 0, mode: "equilibrium" }));
    expect(water.leftVolume).toBe(1);
    expect(water.pressureDifferenceKPa).toBe(0);
  });
});

describe("uniform magnetic field", () => {
  it("preserves speed and perpendicular radius", () => {
    const r = computeMagneticMotion(MagneticMotionConfigSchema.parse({ pitchDeg: 60 }));
    for (const turns of [0, 0.1, 0.25, 0.5, 1, 2.75]) {
      const p = r.stateAtTurns(turns);
      expect(Math.hypot(p.vx, p.vy, p.vz)).toBeCloseTo(r.speed, 6);
      expect(Math.hypot(p.x, p.y + r.sign * r.radius)).toBeCloseTo(r.radius, 12);
    }
    expect(r.stateAtTurns(1).z).toBeCloseTo(r.pitch, 10);
  });
  it("satisfies Lorentz acceleration signs and mass-scaled periods", () => {
    const electron = computeMagneticMotion(MagneticMotionConfigSchema.parse({ particle: "electron" }));
    const proton = computeMagneticMotion(MagneticMotionConfigSchema.parse({ particle: "proton" }));
    expect(electron.stateAtTurns(0.25).vy).toBeGreaterThan(0);
    expect(proton.stateAtTurns(0.25).vy).toBeLessThan(0);
    expect(proton.period / electron.period).toBeCloseTo(proton.mass / electron.mass, 10);
    const h = 1e-6, a = electron.stateAtTurns(0.2 - h), b = electron.stateAtTurns(0.2 + h), m = electron.stateAtTurns(0.2);
    expect((b.vx - a.vx) / (2 * h * electron.period) / (electron.sign * electron.omega * m.vy)).toBeCloseTo(1, 8);
  });
  it("handles a purely parallel straight path", () => {
    const r = computeMagneticMotion(MagneticMotionConfigSchema.parse({ pitchDeg: 0 }));
    expect(r.radius).toBe(0);
    expect(r.current.x).toBe(0);
    expect(r.current.y).toBe(0);
    expect(r.current.z).toBeGreaterThan(0);
  });
});

describe("photoelectric energy and collection", () => {
  it("conserves photon energy and has zero current beyond stopping voltage", () => {
    const r = computePhotoelectric(PhotoelectricEffectConfigSchema.parse({}));
    expect(r.photonEnergyEV).toBeCloseTo(3.09960496083, 9);
    expect(r.maxKineticEV + 2).toBeCloseTo(r.photonEnergyEV, 12);
    expect(r.currentAtVoltage(-r.stoppingVoltage! - 0.001)).toBe(0);
    expect(r.currentAtVoltage(1)).toBeCloseTo(160.2176634, 10);
  });
  it("changes photon count without changing electron maximum energy", () => {
    const config = PhotoelectricEffectConfigSchema.parse({ voltage: 1 });
    const a = computePhotoelectric(config), b = computePhotoelectric({ ...config, photonRateTrillion: 2 });
    expect(b.maxKineticEV).toBe(a.maxKineticEV);
    expect(b.stoppingVoltage).toBe(a.stoppingVoltage);
    expect(b.currentNA).toBe(2 * a.currentNA);
  });
  it("cannot overcome the threshold with brightness and handles threshold equality", () => {
    const dimEnergy = computePhotoelectric(PhotoelectricEffectConfigSchema.parse({ wavelengthNM: 800, workFunctionEV: 3, photonRateTrillion: 10 }));
    expect(dimEnergy.emitting).toBe(false);
    expect(dimEnergy.currentAtVoltage(6)).toBe(0);
    const threshold = computePhotoelectric(PhotoelectricEffectConfigSchema.parse({ wavelengthNM: PHOTON_EV_NM / 2, workFunctionEV: 2 }));
    expect(threshold.maxKineticEV).toBe(0);
    expect(threshold.currentAtVoltage(-1)).toBe(0);
    expect(Number.isFinite(threshold.currentAtVoltage(1))).toBe(true);
  });
});

describe("fifth batch scene rendering", () => {
  const scenes = [
    ["cell", () => createElement(CellDivisionWidget, { config: CellDivisionConfigSchema.parse({ division: "meiosis", stage: 5 }), onChange: () => {} })],
    ["osmosis", () => createElement(OsmosisLabWidget, { config: OsmosisLabConfigSchema.parse({ leftConcentration: 0, mode: "equilibrium" }), onChange: () => {} })],
    ["magnetic", () => createElement(MagneticMotionWidget, { config: MagneticMotionConfigSchema.parse({ pitchDeg: 0, view: "helix" }), onChange: () => {} })],
    ["photoelectric", () => createElement(PhotoelectricEffectWidget, { config: PhotoelectricEffectConfigSchema.parse({ wavelengthNM: 800, workFunctionEV: 5 }), onChange: () => {} })],
  ] as const;
  it.each(scenes)("renders %s with finite attributes", (_id, render) => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
    expect(html).toContain('role="note"');
  });
});
