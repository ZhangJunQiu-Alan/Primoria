import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as schemas from "@primoria/contracts/artifacts/schemas";
import { TutorArtifactSchema } from "@primoria/contracts/artifacts";

// schemas.mjs (runtime) and schemas.d.mts (types) are hand-kept in sync — the
// compiler cannot check across that boundary, so this spec does.
const declarationSource = readFileSync(
  fileURLToPath(
    new URL("../../../packages/contracts/src/artifacts/schemas.d.mts", import.meta.url),
  ),
  "utf8",
);

describe("contracts artifact schemas (.mjs ↔ .d.mts)", () => {
  it("every declared schema exists at runtime and every runtime schema is declared", () => {
    const declared = new Set(
      [...declarationSource.matchAll(/export declare const (\w+):/g)].map((m) => m[1]!),
    );
    const runtime = new Set(Object.keys(schemas));
    expect(declared.size).toBeGreaterThan(0);
    expect([...declared].filter((name) => !runtime.has(name))).toEqual([]);
    expect([...runtime].filter((name) => !declared.has(name))).toEqual([]);
  });

  it("every runtime export is a zod schema", () => {
    for (const [name, value] of Object.entries(schemas)) {
      expect(typeof (value as { safeParse?: unknown }).safeParse, name).toBe("function");
    }
  });

  it("agent tool outputs for each renderer parse as TutorArtifacts", () => {
    const artifacts = [
      { type: "html_widget", title: "w", description: "d", html: "<div></div>", dependencies: [{ url: "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js", global: "d3", kind: "script" }] },
      { type: "visualization_plan", title: "p", approach: "a", technology: "t", keyElements: ["k"] },
      { type: "echarts_widget", title: "c", description: "d", option: { series: [] }, height: 400 },
      { type: "mermaid_diagram", title: "m", definition: "graph TD; A-->B" },
      {
        type: "physics_scene", title: "p", description: "d",
        scene: { bodies: [{ id: "b", shape: "circle", x: 0, y: 0, radius: 5 }], render: { width: 600, height: 400 } },
      },
      {
        type: "algorithm_visualization", title: "a", description: "d", algorithm: "bubble_sort",
        steps: [{ description: "s", kind: "array", array: { values: [2, 1], highlights: [{ index: 0, role: "comparing" }] } }],
      },
      {
        type: "math_explorer", title: "m", description: "d", mode: "cartesian",
        functions: [{ expr: "sin(k*x)" }], parameters: [{ name: "k", min: 1, max: 5, default: 1 }],
        xRange: [0, 6.28],
      },
      {
        type: "wave_visualization", title: "w", description: "d", layout: "beat",
        waves: [{ amplitude: 0.8, frequency: 2 }, { amplitude: 0.8, frequency: 2.4 }],
        audioEnabled: true, audioFrequencies: [440, 444],
      },
      {
        type: "graph_visualization", title: "g", description: "d",
        nodes: [{ id: "a" }, { id: "b", size: 2 }], edges: [{ source: "a", target: "b" }],
      },
      {
        type: "molecule", title: "m", description: "d",
        atoms: [{ id: "o", element: "O", x: 0, y: 0, z: 0 }], bonds: [], representation: "ball_stick",
      },
    ];
    for (const artifact of artifacts) {
      const parsed = TutorArtifactSchema.safeParse(artifact);
      expect(parsed.success, `${artifact.type}: ${JSON.stringify(parsed.success ? "" : parsed.error.issues)}`).toBe(true);
    }
  });

  it("tool-argument schemas keep their model-facing constraints", () => {
    expect(schemas.RenderWaveArgsSchema.safeParse({
      description: "d",
      waves: [{ amplitude: 2, frequency: 1 }],
    }).success).toBe(false);
    expect(schemas.RenderGraphArgsSchema.safeParse({
      description: "d",
      nodes: [{ id: "a", size: 9 }, { id: "b" }],
      edges: [],
    }).success).toBe(false);
    expect(schemas.RenderAlgorithmArgsSchema.safeParse({
      description: "d",
      algorithm: "x",
      steps: [],
    }).success).toBe(false);
    expect(schemas.RenderChatQuizArgsSchema.safeParse({
      questions: [{ kind: "truefalse", id: "q1", question: "?", correct: true }],
    }).success).toBe(true);
  });
});
