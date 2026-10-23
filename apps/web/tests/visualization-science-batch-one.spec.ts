import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalculusLabConfigSchema, calculusLabComponent, computeCalculus, calculusDerivative } from "../src/lib/interactive/components/calculus-lab";
import { RefractionLabConfigSchema, refractionLabComponent, computeRefraction } from "../src/lib/interactive/components/refraction-lab";
import { ProjectileLabConfigSchema, projectileLabComponent, computeProjectile, projectileState } from "../src/lib/interactive/components/projectile-lab";
import { CircuitLabConfigSchema, circuitLabComponent, computeCircuit } from "../src/lib/interactive/components/circuit-lab";
import { MoonPhasesConfigSchema, moonPhasesComponent, computeMoonPhase, SYNODIC_MONTH } from "../src/lib/interactive/components/moon-phases";
import { MendelianGeneticsConfigSchema, mendelianGeneticsComponent, computeMendelianCross } from "../src/lib/interactive/components/mendelian-genetics";
import { CalculusLabWidget } from "../src/components/generative-ui/interactive/calculus-lab";
import { RefractionLabWidget } from "../src/components/generative-ui/interactive/refraction-lab";
import { ProjectileLabWidget } from "../src/components/generative-ui/interactive/projectile-lab";
import { CircuitLabWidget } from "../src/components/generative-ui/interactive/circuit-lab";
import { MoonPhasesWidget } from "../src/components/generative-ui/interactive/moon-phases";
import { MendelianGeneticsWidget } from "../src/components/generative-ui/interactive/mendelian-genetics";

describe("science batch one config boundaries", () => {
  it.each([calculusLabComponent, refractionLabComponent, projectileLabComponent, circuitLabComponent, moonPhasesComponent, mendelianGeneticsComponent])("validates defaults and rejects unknown config/patch keys for $componentId", (entry) => {
    expect(entry.configSchema.safeParse({}).success).toBe(true);
    expect(entry.configSchema.safeParse({ html: "<script>" }).success).toBe(false);
    expect(entry.patchSchema.parse({})).toEqual({});
    expect(entry.patchSchema.safeParse({ unexpected: 1 }).success).toBe(false);
  });

  it("rejects non-finite, out-of-domain and fractional integer parameters", () => {
    expect(RefractionLabConfigSchema.safeParse({ n1: 0 }).success).toBe(false);
    expect(ProjectileLabConfigSchema.safeParse({ gravity: 0 }).success).toBe(false);
    expect(CircuitLabConfigSchema.safeParse({ resistance1: 0 }).success).toBe(false);
    expect(CalculusLabConfigSchema.safeParse({ subdivisions: 2.5 }).success).toBe(false);
    expect(MoonPhasesConfigSchema.safeParse({ day: Infinity }).success).toBe(false);
    expect(MendelianGeneticsConfigSchema.safeParse({ parent1: "aA" }).success).toBe(false);
  });
});

describe("calculus independent examples", () => {
  it("matches the cubic difference quotient at x=1", () => {
    const base = CalculusLabConfigSchema.parse({});
    expect(computeCalculus(base).secant).toBeCloseTo(1.75, 10);
    const near = computeCalculus({ ...base, deltaX: 0.02 });
    expect(near.derivative).toBe(0);
    expect(near.secant).toBeCloseTo(0.0604, 10);
    expect(near.error).toBeCloseTo(0.0604, 10);
  });
  it("preserves undefined division and the cusp", () => {
    expect(computeCalculus(CalculusLabConfigSchema.parse({ deltaX: 0 })).secant).toBeNull();
    expect(calculusDerivative("absolute", 0)).toBeNull();
    expect(calculusDerivative("absolute", -1)).toBe(-1);
  });
  it("computes signed area including reversed limits", () => {
    const forward = computeCalculus(CalculusLabConfigSchema.parse({ functionType: "quadratic", x0: 0, intervalEnd: 1, subdivisions: 80 }));
    expect(forward.exactIntegral).toBeCloseTo(1 / 3, 12);
    expect(Math.abs(forward.midpointIntegral - 1 / 3)).toBeLessThan(0.00002);
    expect(computeCalculus(CalculusLabConfigSchema.parse({ functionType: "quadratic", x0: 1, intervalEnd: 0 })).exactIntegral).toBeCloseTo(-1 / 3, 12);
    expect(computeCalculus(CalculusLabConfigSchema.parse({ functionType: "absolute", x0: -1, intervalEnd: 1 })).exactIntegral).toBe(1);
  });
});

describe("optical boundary conservation", () => {
  it("matches Snell's law at 60 degrees from air to glass", () => {
    const r = computeRefraction(RefractionLabConfigSchema.parse({ incidenceDeg: 60 }));
    expect(r.refractionDeg).toBeCloseTo(35.264389682754654, 10);
    expect(r.reflectance + r.transmittance).toBeCloseTo(1, 12);
  });
  it("handles total internal reflection and normal incidence", () => {
    const r = computeRefraction(RefractionLabConfigSchema.parse({ n1: 1.5, n2: 1, incidenceDeg: 60 }));
    expect(r.criticalDeg).toBeCloseTo(41.810314895778596, 10);
    expect(r.refractionDeg).toBeNull();
    expect(r.reflectance).toBe(1);
    expect(computeRefraction(RefractionLabConfigSchema.parse({ incidenceDeg: 0 })).reflectance).toBeCloseTo(0.04, 12);
  });
  it("gives zero p-polarized reflection at Brewster's angle", () => {
    const r = computeRefraction(RefractionLabConfigSchema.parse({ incidenceDeg: Math.atan(1.5) * 180 / Math.PI, polarization: "p" }));
    expect(r.reflectance).toBeLessThan(1e-25);
  });
});

describe("projectile flight", () => {
  it("matches the analytic 45-degree vacuum solution", () => {
    const r = computeProjectile(ProjectileLabConfigSchema.parse({ speed: 20, angleDeg: 45, gravity: 10 }));
    expect(r.range).toBeCloseTo(40, 10);
    expect(r.flightTime).toBeCloseTo(2 * Math.sqrt(2), 10);
    expect(r.maxHeight).toBeCloseTo(10, 10);
    expect(r.trajectory.at(-1)?.y).toBeCloseTo(0, 10);
  });
  it("handles stationary ground launch and horizontal launch from a height", () => {
    expect(computeProjectile(ProjectileLabConfigSchema.parse({ speed: 0, drag: 1 })).flightTime).toBe(0);
    const r = computeProjectile(ProjectileLabConfigSchema.parse({ angleDeg: 0, launchHeight: 20, speed: 10, gravity: 10 }));
    expect(r.flightTime).toBeCloseTo(2, 12);
    expect(r.range).toBeCloseTo(20, 12);
  });
  it("satisfies the linear-drag ODE and finds the ground crossing", () => {
    const config = ProjectileLabConfigSchema.parse({ drag: 0.4, launchHeight: 10 });
    const h = 0.0001, time = 1;
    const left = projectileState(config, time - h), right = projectileState(config, time + h), middle = projectileState(config, time);
    expect((right.vx - left.vx) / (2 * h)).toBeCloseTo(-config.drag * middle.vx, 7);
    expect((right.vy - left.vy) / (2 * h)).toBeCloseTo(-config.gravity - config.drag * middle.vy, 7);
    const result = computeProjectile(config);
    expect(projectileState(config, result.flightTime).y).toBeCloseTo(0, 9);
    expect(result.range).toBeLessThan(computeProjectile({ ...config, drag: 0 }).range);
  });
  it("approaches the vacuum solution continuously for very small drag", () => {
    const config = ProjectileLabConfigSchema.parse({ drag: 1e-12, launchHeight: 10 });
    const tiny = computeProjectile(config), vacuum = computeProjectile({ ...config, drag: 0 });
    expect(tiny.range).toBeCloseTo(vacuum.range, 7);
    expect(tiny.flightTime).toBeCloseTo(vacuum.flightTime, 8);
    expect(projectileState(config, 0).y).toBe(10);
  });
});

describe("resistor circuit laws", () => {
  it("divides voltage in series", () => {
    const r = computeCircuit(CircuitLabConfigSchema.parse({}));
    expect(r.current).toBeCloseTo(0.02, 12);
    expect(r.voltage1).toBe(2);
    expect(r.voltage2).toBe(4);
    expect(r.power1 + r.power2).toBeCloseTo(r.power, 12);
  });
  it("divides current in parallel and conserves power", () => {
    const r = computeCircuit(CircuitLabConfigSchema.parse({ topology: "parallel" }));
    expect(r.current).toBeCloseTo(0.09, 12);
    expect(r.voltage1).toBe(6);
    expect(r.voltage2).toBe(6);
    expect(r.current1 + r.current2).toBeCloseTo(r.current, 12);
    expect(r.power1 + r.power2).toBeCloseTo(r.power, 12);
  });
  it("distinguishes an open circuit from a short circuit", () => {
    const r = computeCircuit(CircuitLabConfigSchema.parse({ switchClosed: false }));
    expect(r.current).toBe(0);
    expect(r.equivalentResistance).toBeNull();
    expect(r.voltage1).toBe(0);
    expect(r.power).toBe(0);
  });
});

describe("Moon phase geometry", () => {
  it.each([[0, 0], [0.25, 0.5], [0.5, 1], [0.75, 0.5], [1, 0]])("at month fraction %s has illuminated fraction %s", (fraction, expected) => {
    expect(computeMoonPhase(MoonPhasesConfigSchema.parse({ day: fraction * SYNODIC_MONTH })).illuminatedFraction).toBeCloseTo(expected, 12);
  });
  it("changes orientation without changing illumination between hemispheres", () => {
    const north = computeMoonPhase(MoonPhasesConfigSchema.parse({ day: 5 }));
    const south = computeMoonPhase(MoonPhasesConfigSchema.parse({ day: 5, hemisphere: "south" }));
    expect(north.illuminatedFraction).toBe(south.illuminatedFraction);
    for (let i = 0; i < north.outline.length; i++) expect(north.outline[i].x).toBe(-south.outline[i].x);
  });
});

describe("Mendelian probability", () => {
  it("distinguishes genotype 1:2:1 from phenotype 3:1", () => {
    const r = computeMendelianCross(MendelianGeneticsConfigSchema.parse({}));
    expect(r.probabilities).toEqual({ AA: 0.25, Aa: 0.5, aa: 0.25 });
    expect(r.phenotypes).toEqual([0.75, 0.25]);
    expect(computeMendelianCross(MendelianGeneticsConfigSchema.parse({ dominance: "incomplete" })).phenotypes).toEqual([0.25, 0.5, 0.25]);
  });
  it("handles test crosses and homozygous parents", () => {
    expect(computeMendelianCross(MendelianGeneticsConfigSchema.parse({ parent2: "aa" })).probabilities).toEqual({ AA: 0, Aa: 0.5, aa: 0.5 });
    expect(computeMendelianCross(MendelianGeneticsConfigSchema.parse({ parent1: "AA", parent2: "aa" })).probabilities).toEqual({ AA: 0, Aa: 1, aa: 0 });
  });
  it("conserves probability for all parental combinations", () => {
    for (const parent1 of ["AA", "Aa", "aa"]) for (const parent2 of ["AA", "Aa", "aa"]) {
      const r = computeMendelianCross(MendelianGeneticsConfigSchema.parse({ parent1, parent2 }));
      expect(Object.values(r.probabilities).reduce((a, b) => a + b, 0)).toBe(1);
    }
  });
});

describe("science scene server rendering", () => {
  const scenes = [
    ["calculus", () => createElement(CalculusLabWidget, { config: CalculusLabConfigSchema.parse({ deltaX: 0 }), onChange: () => {} })],
    ["refraction", () => createElement(RefractionLabWidget, { config: RefractionLabConfigSchema.parse({ n1: 1.5, n2: 1, incidenceDeg: 60 }), onChange: () => {} })],
    ["projectile", () => createElement(ProjectileLabWidget, { config: ProjectileLabConfigSchema.parse({ speed: 0 }), onChange: () => {} })],
    ["circuit", () => createElement(CircuitLabWidget, { config: CircuitLabConfigSchema.parse({ topology: "parallel", switchClosed: false }), onChange: () => {} })],
    ["moon", () => createElement(MoonPhasesWidget, { config: MoonPhasesConfigSchema.parse({ day: 0 }), onChange: () => {} })],
    ["genetics", () => createElement(MendelianGeneticsWidget, { config: MendelianGeneticsConfigSchema.parse({}), onChange: () => {} })],
  ] as const;
  it.each(scenes)("renders %s without invalid numeric attributes or an expand gate", (_id, render) => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain("<svg");
    expect(html).toContain('role="note"');
    expect(html).not.toMatch(/(?:NaN|Infinity|undefined)/);
    expect(html).not.toMatch(/展开|打开实验|<details/);
    expect(html).toContain("data-component-id=");
  });
});
