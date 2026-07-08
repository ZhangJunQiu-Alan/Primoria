import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LEARNING_OBJECT_CSS, PRIMORIA_PALETTE_JS } from "../src/components/generative-ui/style-tokens";

// The agent prompt (graph.mjs) speaks the style vocabulary — class names, CSS
// variables, PRIMORIA palette keys — while the values live in apps/web. The
// agent cannot import from apps/web, so this test is the sync guard: every
// name the prompt mentions must actually exist in what the iframe injects.

const graphSource = readFileSync(
  fileURLToPath(new URL("../../agent/src/graph.mjs", import.meta.url)),
  "utf8",
);

// SVG_CLASSES_CSS lives in widget-renderer.tsx; read as text to avoid pulling
// the React component tree into the test.
const widgetRendererSource = readFileSync(
  fileURLToPath(new URL("../src/components/generative-ui/widget-renderer.tsx", import.meta.url)),
  "utf8",
);

describe("style vocabulary sync between graph.mjs and the injected widget styles", () => {
  it("mentions the vocabulary in the prompt at all", () => {
    expect(graphSource).toContain("lo-stage");
    expect(graphSource).toContain("PRIMORIA.");
    expect(graphSource).toContain("--series-");
  });

  it("every lo-* class in the prompt exists in LEARNING_OBJECT_CSS", () => {
    // (?<!-) keeps --lo-* CSS variables out of the class-name matches.
    const names = new Set(graphSource.match(/(?<!-)\blo-[a-z]+(?:-[a-z]+)*\b/g) ?? []);
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) {
      expect(LEARNING_OBJECT_CSS, `missing .${name}`).toContain(`.${name}`);
    }
  });

  it("every c-* SVG class in the prompt exists in SVG_CLASSES_CSS", () => {
    const names = new Set(graphSource.match(/\bc-[a-z]+\b/g) ?? []);
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) {
      expect(widgetRendererSource, `missing .${name}`).toContain(`.${name}`);
    }
  });

  it("every CSS variable in the prompt exists in LEARNING_OBJECT_CSS", () => {
    const names = new Set(graphSource.match(/--(?:lo|series)-[a-z]+(?:-[a-z]+)*/g) ?? []);
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) {
      expect(LEARNING_OBJECT_CSS, `missing ${name}`).toContain(`${name}:`);
    }
  });

  it("every PRIMORIA.* key in the prompt exists in the palette global", () => {
    const keys = new Set(
      (graphSource.match(/PRIMORIA\.[a-zA-Z]+/g) ?? []).map((m) => m.split(".")[1]!),
    );
    expect(keys.size).toBeGreaterThan(0);
    for (const key of keys) {
      expect(PRIMORIA_PALETTE_JS, `missing PRIMORIA.${key}`).toContain(`${key}:`);
    }
  });

  it("the palette global is injected into the widget iframe shell", () => {
    expect(widgetRendererSource).toContain("PRIMORIA_PALETTE_JS");
    expect(widgetRendererSource).toContain("LEARNING_OBJECT_CSS");
  });
});
