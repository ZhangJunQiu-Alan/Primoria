import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { listGraphIds } from "../scripts/kg-db-common.mjs";
import { buildGraphCandidates } from "../src/lib/knowledge-graph/graph-router";

const repoRoot = resolve(import.meta.dirname, "../../..");

function readTempleJson(name: string) {
  return JSON.parse(readFileSync(resolve(repoRoot, "temple", name), "utf8"));
}

describe("curated KG library integrity", () => {
  it("keeps source-map sidecars out of the graph registry", () => {
    const graphIds = listGraphIds();

    expect(graphIds).toContain("python_fundamentals");
    expect(graphIds).toContain("sicp_cs61a");
    expect(graphIds).not.toContain("python_fundamentals_source_map");
    expect(graphIds).not.toContain("Python");
  });

  it("separates beginner Python from the CS61A/SICP curriculum", () => {
    const fundamentals = readTempleJson("python_fundamentals.json");
    const sicp = readTempleJson("sicp_cs61a.json");

    expect(fundamentals.subject).toBe("Python Fundamentals");
    expect(fundamentals.nodes.some((node: { id?: string }) => node.id === "pyf_interactive_execution")).toBe(true);
    expect(sicp.subject).toBe("Structure and Interpretation of Computer Programs (CS61A)");
    expect(sicp.nodes.some((node: { id?: string }) => node.id === "recursion")).toBe(true);
  });

  it("maps every Python Fundamentals concept to exactly one source record", () => {
    const graph = readTempleJson("python_fundamentals.json");
    const sourceMap = readTempleJson("python_fundamentals_source_map.json");
    const conceptIds = graph.nodes
      .filter((node: { kind?: string }) => node.kind === "concept")
      .map((node: { id: string }) => node.id)
      .sort();
    const coveredIds = sourceMap.coverage.map((item: { concept_id: string }) => item.concept_id).sort();

    expect(new Set(coveredIds).size).toBe(coveredIds.length);
    expect(coveredIds).toEqual(conceptIds);
  });

  it("keeps beginner intent aliases on the Python Fundamentals root", () => {
    const aliases = JSON.parse(
      readFileSync(
        resolve(repoRoot, "apps/web/src/lib/knowledge-graph/data/node-aliases.python_fundamentals.json"),
        "utf8",
      ),
    );

    expect(aliases.graphId).toBe("python_fundamentals");
    expect(aliases.aliases.pyf_topic_running_python_programs).toContain("learn Python from scratch");
    expect(aliases.aliases.pyf_topic_running_python_programs).toContain("从零开始学 Python");
  });

  it("promotes an explicitly named subject even when vector recall misses it", () => {
    const candidates = buildGraphCandidates([], 6, "Python from the beginning");

    expect(candidates[0]).toMatchObject({
      graphId: "python_fundamentals",
      subject: "Python Fundamentals",
    });
  });
});
