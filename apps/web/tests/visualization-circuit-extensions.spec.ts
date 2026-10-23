import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WireResistanceConfigSchema, WireResistancePatchSchema, computeWireResistance } from "../src/lib/interactive/components/wire-resistance";
import { ClosedCircuitConfigSchema, ClosedCircuitPatchSchema, closedCircuitLoadPower, computeClosedCircuit } from "../src/lib/interactive/components/closed-circuit";
import { WireResistanceWidget } from "../src/components/generative-ui/interactive/wire-resistance";
import { ClosedCircuitWidget } from "../src/components/generative-ui/interactive/closed-circuit";

describe("uniform wire resistance", () => {
  it("converts micro-ohm metres and square millimetres into ohms", () => {
    const r = computeWireResistance(WireResistanceConfigSchema.parse({ resistivityMicroOhmM: 0.017, lengthM: 10, areaMM2: 2 }));
    expect(r.resistance).toBeCloseTo((0.017e-6 * 10) / 2e-6, 12);
    expect(Math.PI * r.diameterMM ** 2 / 4).toBeCloseTo(2, 12);
  });
  it("varies length and area independently without confusing area and diameter", () => {
    const config = WireResistanceConfigSchema.parse({}), r = computeWireResistance(config);
    expect(computeWireResistance({ ...config, lengthM: config.lengthM * 2 }).resistance).toBeCloseTo(2 * r.resistance, 12);
    expect(computeWireResistance({ ...config, areaMM2: config.areaMM2 * 2 }).resistance).toBeCloseTo(r.resistance / 2, 12);
    expect(computeWireResistance({ ...config, areaMM2: config.areaMM2 * 4 }).diameterMM).toBeCloseTo(2 * r.diameterMM, 12);
  });
  it("applies the temperature correction relative to 20°C exactly once", () => {
    const config = WireResistanceConfigSchema.parse({ temperatureC: 120, temperatureCoefficient: 0.004 });
    expect(computeWireResistance(config).temperatureFactor).toBeCloseTo(1.4, 12);
    expect(computeWireResistance(config).temperatureChangePercent).toBeCloseTo(40, 12);
    expect(computeWireResistance({ ...config, temperatureCoefficient: 0 }).resistance).toBe(computeWireResistance({ ...config, temperatureC: 20 }).resistance);
  });
  it("keeps every corner of the declared physical bounds positive and finite", () => {
    for (const temperatureC of [-20, 150]) for (const temperatureCoefficient of [0, 0.006]) for (const resistivityMicroOhmM of [0.01, 2]) for (const lengthM of [0.1, 20]) for (const areaMM2 of [0.05, 10]) {
      const r = computeWireResistance(WireResistanceConfigSchema.parse({ temperatureC, temperatureCoefficient, resistivityMicroOhmM, lengthM, areaMM2 }));
      expect(r.resistance).toBeGreaterThan(0); expect(Number.isFinite(r.resistance)).toBe(true);
    }
  });
  it("rejects zero area and arbitrary fields", () => {
    expect(WireResistanceConfigSchema.safeParse({ areaMM2: 0 }).success).toBe(false);
    expect(WireResistancePatchSchema.safeParse({ diameter: 2 }).success).toBe(false);
    expect(WireResistancePatchSchema.safeParse({ html: "x" }).success).toBe(false);
  });
  it("renders all four teaching views with finite coordinates", () => {
    for (const view of ["geometry", "length", "area", "temperature"] as const) {
      const html = renderToStaticMarkup(createElement(WireResistanceWidget, { config: WireResistanceConfigSchema.parse({ view }), onChange: () => {} }));
      expect(html).toContain('data-component-id="physics.wire-resistance"'); expect(html).not.toMatch(/NaN|Infinity|undefined/);
      expect(html).toContain('aria-valuetext="0.0039/°C"');
    }
  });
});

describe("source internal resistance and closed circuit", () => {
  it("separates EMF, terminal voltage and both power sinks", () => {
    const r = computeClosedCircuit(ClosedCircuitConfigSchema.parse({ emf: 12, internalResistance: 2, loadResistance: 4 }));
    expect(r.current).toBe(2); expect(r.terminalVoltage).toBe(8); expect(r.sourcePower).toBe(24);
    expect(r.loadPower).toBe(16); expect(r.internalPower).toBe(8); expect(r.efficiency).toBeCloseTo(2 / 3, 12);
  });
  it("distinguishes an open switch from a zero-ohm load", () => {
    const config = ClosedCircuitConfigSchema.parse({ emf: 6, internalResistance: 2, loadResistance: 0 });
    const short = computeClosedCircuit(config), open = computeClosedCircuit({ ...config, switchClosed: false });
    expect(short.state).toBe("short"); expect(short.current).toBe(3); expect(short.terminalVoltage).toBe(0); expect(short.internalPower).toBe(18);
    expect(open.state).toBe("open"); expect(open.current).toBe(0); expect(open.terminalVoltage).toBe(6); expect(open.loadVoltage).toBe(0); expect(open.sourcePower).toBe(0);
  });
  it("does not silently turn ideal-source shorts into zero current or infinity", () => {
    const config = ClosedCircuitConfigSchema.parse({ internalResistance: 0, loadResistance: 0 });
    const r = computeClosedCircuit(config);
    expect(r.state).toBe("ideal-short"); expect(r.current).toBeNull(); expect(r.terminalVoltage).toBeNull(); expect(r.sourcePower).toBeNull();
    expect(computeClosedCircuit({ ...config, emf: 0 }).state).toBe("indeterminate");
    expect(closedCircuitLoadPower(6, 0, 0)).toBeNull();
  });
  it("supports a finite load on an ideal source without inventing a finite maximum", () => {
    const r = computeClosedCircuit(ClosedCircuitConfigSchema.parse({ emf: 6, internalResistance: 0, loadResistance: 3 }));
    expect(r.current).toBe(2); expect(r.terminalVoltage).toBe(6); expect(r.internalPower).toBe(0); expect(r.efficiency).toBe(1); expect(r.maximumLoadPower).toBeNull();
  });
  it("finds maximum load power at matching resistance, not maximum efficiency", () => {
    const config = ClosedCircuitConfigSchema.parse({ emf: 12, internalResistance: 2, loadResistance: 2 });
    const match = computeClosedCircuit(config), efficient = computeClosedCircuit({ ...config, loadResistance: 20 });
    expect(match.loadPower).toBe(18); expect(match.maximumLoadPower).toBe(18); expect(match.efficiency).toBe(0.5);
    expect(efficient.efficiency).toBeGreaterThan(0.9); expect(efficient.loadPower).toBeLessThan(18);
    for (const load of [0, 0.01, 0.1, 1, 1.99, 2, 2.01, 5, 100]) expect(closedCircuitLoadPower(12, 2, load)!).toBeLessThanOrEqual(18);
  });
  it("has no efficiency without energy flow", () => {
    const config = ClosedCircuitConfigSchema.parse({ emf: 0 });
    expect(computeClosedCircuit(config).current).toBe(0); expect(computeClosedCircuit(config).efficiency).toBeNull();
    expect(computeClosedCircuit({ ...config, internalResistance: 0 }).maximumLoadPower).toBe(0);
    expect(computeClosedCircuit({ ...config, emf: 6, switchClosed: false }).efficiency).toBeNull();
  });
  it("conserves voltage and power over independent load and source combinations", () => {
    for (const emf of [0, 0.01, 6, 24]) for (const internalResistance of [0, 0.01, 2, 10]) for (const loadResistance of [0, 0.01, 5, 100]) {
      const r = computeClosedCircuit(ClosedCircuitConfigSchema.parse({ emf, internalResistance, loadResistance }));
      if (r.current === null) continue;
      expect(r.terminalVoltage! + r.current * internalResistance).toBeCloseTo(emf, 10);
      expect(r.loadPower! + r.internalPower!).toBeCloseTo(r.sourcePower!, 8);
      expect(closedCircuitLoadPower(emf, internalResistance, loadResistance)).toBeCloseTo(r.loadPower!, 8);
    }
  });
  it("rejects unsupported coefficient precision and custom code", () => {
    expect(ClosedCircuitConfigSchema.safeParse({ internalResistance: 1e-10 }).success).toBe(false);
    expect(ClosedCircuitPatchSchema.safeParse({ loadResistance: -1 }).success).toBe(false);
    expect(ClosedCircuitPatchSchema.safeParse({ script: "x" }).success).toBe(false);
  });
  it("renders all modes and degenerate states without non-finite SVG coordinates", () => {
    for (const view of ["circuit", "characteristic", "power"] as const) for (const input of [{}, { switchClosed: false }, { internalResistance: 0, loadResistance: 0 }, { emf: 0, internalResistance: 0, loadResistance: 0 }]) {
      const html = renderToStaticMarkup(createElement(ClosedCircuitWidget, { config: ClosedCircuitConfigSchema.parse({ ...input, view }), onChange: () => {} }));
      expect(html).toContain('data-component-id="physics.closed-circuit"'); expect(html).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
