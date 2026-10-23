import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FractionEquivalenceConfigSchema, computeFractionEquivalence, fractionEquivalenceComponent } from "../src/lib/interactive/components/fraction-equivalence";
import { ChickenRabbitConfigSchema, computeChickenRabbit, chickenRabbitComponent } from "../src/lib/interactive/components/chicken-rabbit";
import { EarthSeasonsConfigSchema, computeEarthSeasons, earthSeasonsComponent } from "../src/lib/interactive/components/earth-seasons";
import { IdealGasConfigSchema, computeIdealGas, idealGasComponent } from "../src/lib/interactive/components/ideal-gas";
import { ReactionKineticsConfigSchema, computeReactionKinetics, reactionKineticsComponent } from "../src/lib/interactive/components/reaction-kinetics";
import { OscillationLabConfigSchema, computeOscillation, oscillationLabComponent } from "../src/lib/interactive/components/oscillation-lab";
import { FractionEquivalenceWidget } from "../src/components/generative-ui/interactive/fraction-equivalence";
import { ChickenRabbitWidget } from "../src/components/generative-ui/interactive/chicken-rabbit";
import { EarthSeasonsWidget } from "../src/components/generative-ui/interactive/earth-seasons";
import { IdealGasWidget } from "../src/components/generative-ui/interactive/ideal-gas";
import { ReactionKineticsWidget } from "../src/components/generative-ui/interactive/reaction-kinetics";
import { OscillationLabWidget } from "../src/components/generative-ui/interactive/oscillation-lab";

describe("second science batch contracts", () => {
  it.each([fractionEquivalenceComponent, chickenRabbitComponent, earthSeasonsComponent, idealGasComponent, reactionKineticsComponent, oscillationLabComponent])("strictly validates defaults and partial patches for $componentId", (entry) => {
    expect(entry.configSchema.safeParse({}).success).toBe(true);
    expect(entry.patchSchema.parse({})).toEqual({});
    expect(entry.configSchema.safeParse({ unsafe: "<script>" }).success).toBe(false);
    expect(entry.patchSchema.safeParse({ unsafe: "<script>" }).success).toBe(false);
  });
  it("rejects impossible scalar domains", () => {
    expect(FractionEquivalenceConfigSchema.safeParse({ denominator: 0 }).success).toBe(false);
    expect(ChickenRabbitConfigSchema.safeParse({ heads: 1.5 }).success).toBe(false);
    expect(EarthSeasonsConfigSchema.safeParse({ latitude: 91 }).success).toBe(false);
    expect(IdealGasConfigSchema.safeParse({ temperatureK: 0 }).success).toBe(false);
    expect(ReactionKineticsConfigSchema.safeParse({ temperatureK: NaN }).success).toBe(false);
    expect(OscillationLabConfigSchema.safeParse({ lengthM: 0 }).success).toBe(false);
  });
});

describe("fraction model", () => {
  it("preserves value, reduces fractions, and represents improper fractions", () => {
    const r = computeFractionEquivalence(FractionEquivalenceConfigSchema.parse({ numerator: 8, denominator: 6, factor: 3 }));
    expect(r.equivalentNumerator).toBe(24);
    expect(r.equivalentDenominator).toBe(18);
    expect(r.simplifiedNumerator).toBe(4);
    expect(r.simplifiedDenominator).toBe(3);
    expect(r.whole).toBe(1);
    expect(r.remainder).toBe(2);
    expect(r.equivalentNumerator / r.equivalentDenominator).toBe(r.value);
  });
  it("reduces zero without dividing by zero", () => {
    const r = computeFractionEquivalence(FractionEquivalenceConfigSchema.parse({ numerator: 0 }));
    expect(r.simplifiedNumerator).toBe(0);
    expect(r.simplifiedDenominator).toBe(1);
  });
});

describe("chicken-rabbit constraints", () => {
  it("solves both constraints exactly", () => {
    const r = computeChickenRabbit(ChickenRabbitConfigSchema.parse({}));
    expect(r.chickens).toBe(5);
    expect(r.rabbits).toBe(3);
  });
  it.each([0, 15, 23, 34])("does not invent a solution for 8 heads and %s legs", (legs) => {
    const r = computeChickenRabbit(ChickenRabbitConfigSchema.parse({ legs }));
    expect(r.valid).toBe(false);
    expect(r.rabbits).toBeNull();
    expect(r.chickens).toBeNull();
  });
  it("handles all-chicken and all-rabbit boundaries", () => {
    expect(computeChickenRabbit(ChickenRabbitConfigSchema.parse({ heads: 30, legs: 60 })).chickens).toBe(30);
    expect(computeChickenRabbit(ChickenRabbitConfigSchema.parse({ heads: 30, legs: 120 })).rabbits).toBe(30);
  });
});

describe("season geometry", () => {
  it("gives equinox daylight and noon altitude", () => {
    const r = computeEarthSeasons(EarthSeasonsConfigSchema.parse({ dayOfYear: 80, latitude: 40 }));
    expect(r.declinationDeg).toBe(0);
    expect(r.daylightHours).toBeCloseTo(12, 12);
    expect(r.noonAltitude).toBeCloseTo(50, 12);
  });
  it("gives opposite polar-day conditions", () => {
    const north = computeEarthSeasons(EarthSeasonsConfigSchema.parse({ latitude: 90 }));
    const south = computeEarthSeasons(EarthSeasonsConfigSchema.parse({ latitude: -90 }));
    expect(north.daylightHours).toBe(24);
    expect(south.daylightHours).toBe(0);
    expect(north.declinationDeg).toBeGreaterThan(23.4);
    expect(north.declinationDeg).toBeLessThanOrEqual(23.44);
  });
  it("removes seasonal daylight variation at zero tilt", () => {
    for (const dayOfYear of [1, 80, 172, 266, 355]) expect(computeEarthSeasons(EarthSeasonsConfigSchema.parse({ dayOfYear, axialTilt: 0 })).daylightHours).toBeCloseTo(12, 12);
  });
  it("keeps all edge latitudes finite", () => {
    for (const latitude of [-90, -89.99, 0, 89.99, 90]) {
      const r = computeEarthSeasons(EarthSeasonsConfigSchema.parse({ latitude, dayOfYear: 80 }));
      expect(Number.isFinite(r.daylightHours)).toBe(true);
      expect(Number.isFinite(r.dailyMeanFlux)).toBe(true);
    }
  });
});

describe("ideal gas laws", () => {
  it("matches the standard-volume pressure and inverse-volume relationship", () => {
    const r = computeIdealGas(IdealGasConfigSchema.parse({ temperatureK: 273.15, volumeL: 22.414 }));
    expect(r.pressureKPa).toBeCloseTo(101.325, 2);
    expect(r.pressureAtVolume(10)).toBeCloseTo(2 * r.pressureAtVolume(20), 12);
  });
  it("keeps pressure independent of species but changes molecular speed", () => {
    const helium = computeIdealGas(IdealGasConfigSchema.parse({ gas: "helium" }));
    const nitrogen = computeIdealGas(IdealGasConfigSchema.parse({ gas: "nitrogen" }));
    expect(helium.pressureKPa).toBe(nitrogen.pressureKPa);
    expect(helium.rmsSpeed).toBeGreaterThan(nitrogen.rmsSpeed);
    expect(helium.meanTranslationalEnergyPerMol).toBe(nitrogen.meanTranslationalEnergyPerMol);
  });
});

describe("reaction kinetics", () => {
  it.each(["zero", "first", "second"])("reaches half concentration at the %s-order half-life", (order) => {
    const r = computeReactionKinetics(ReactionKineticsConfigSchema.parse({ order }));
    expect(r.concentrationAt(r.halfLife)).toBeCloseTo(0.5, 12);
  });
  it("preserves mass balance and zero-order exhaustion", () => {
    const r = computeReactionKinetics(ReactionKineticsConfigSchema.parse({ order: "zero", elapsedSeconds: 60 }));
    expect(r.concentration).toBe(0);
    expect(r.rate).toBe(0);
    expect(r.concentration + r.productConcentration).toBe(1);
  });
  it("implements the Arrhenius reference and temperature direction", () => {
    const base = ReactionKineticsConfigSchema.parse({});
    expect(computeReactionKinetics(base).rateConstant).toBe(0.1);
    expect(computeReactionKinetics({ ...base, temperatureK: 330 }).rateConstant).toBeGreaterThan(0.1);
    expect(computeReactionKinetics({ ...base, temperatureK: 280 }).rateConstant).toBeLessThan(0.1);
    const first = computeReactionKinetics(base);
    expect(computeReactionKinetics({ ...base, initialConcentration: 2 }).halfLife).toBe(first.halfLife);
  });
});

describe("undamped oscillators", () => {
  it("gives the spring mass law and conserves energy", () => {
    const base = OscillationLabConfigSchema.parse({});
    const r = computeOscillation(base);
    expect(r.period).toBeCloseTo(2 * Math.PI / Math.sqrt(10), 12);
    expect(computeOscillation({ ...base, massKg: 4 }).period).toBeCloseTo(2 * r.period, 12);
    const quarter = computeOscillation({ ...base, elapsedSeconds: r.period / 4 });
    expect(quarter.displacement).toBeCloseTo(0, 12);
    expect(quarter.kinetic + quarter.potential).toBeCloseTo(r.totalEnergy, 12);
  });
  it("uses nonlinear pendulum periods independent of mass", () => {
    const base = OscillationLabConfigSchema.parse({ system: "pendulum", angleDeg: 30, lengthM: 0.2, elapsedSeconds: 20 });
    const r = computeOscillation(base);
    expect(r.period).toBeGreaterThan(2 * Math.PI * Math.sqrt(0.2 / 9.8));
    expect(computeOscillation({ ...base, massKg: 4 }).period).toBe(r.period);
    expect(Math.abs(r.potential + r.kinetic - r.totalEnergy) / r.totalEnergy).toBeLessThan(0.0003);
  });
});

describe("batch two scene rendering", () => {
  const scenes = [
    ["fractions", () => createElement(FractionEquivalenceWidget, { config: FractionEquivalenceConfigSchema.parse({ numerator: 12, denominator: 1 }), onChange: () => {} })],
    ["chicken-rabbit", () => createElement(ChickenRabbitWidget, { config: ChickenRabbitConfigSchema.parse({ legs: 23 }), onChange: () => {} })],
    ["seasons", () => createElement(EarthSeasonsWidget, { config: EarthSeasonsConfigSchema.parse({ latitude: 90 }), onChange: () => {} })],
    ["gas", () => createElement(IdealGasWidget, { config: IdealGasConfigSchema.parse({ volumeL: 0.5 }), onChange: () => {} })],
    ["kinetics", () => createElement(ReactionKineticsWidget, { config: ReactionKineticsConfigSchema.parse({ order: "zero", elapsedSeconds: 60 }), onChange: () => {} })],
    ["oscillation", () => createElement(OscillationLabWidget, { config: OscillationLabConfigSchema.parse({ system: "pendulum", elapsedSeconds: 20 }), onChange: () => {} })],
  ] as const;
  it.each(scenes)("renders %s boundary state without invalid attributes", (_id, render) => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/(?:NaN|Infinity|undefined)/);
    expect(html).toContain('role="note"');
    expect(html).not.toMatch(/展开|<details/);
  });
});
