import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { searchInteractiveComponents, formatInteractiveDirectory, normalizeInteractiveDiscipline } from "@primoria/contracts/artifacts/interactive-search";

it("accepts bilingual and combined discipline labels without a false coverage miss", () => {
  expect(searchInteractiveComponents({ query: "定向住房补贴 普惠住房补贴", discipline: "社会科学 / 公共政策" }).map((entry) => entry.componentId)).toContain("social.policy-tradeoff");
  expect(searchInteractiveComponents({ query: "circuit", discipline: "物理", stage: "高中" }).map((entry) => entry.componentId)).toContain("physics.circuit-lab");
});
import { INTERACTIVE_COMPONENT_CATALOG } from "@primoria/contracts/artifacts/interactive-catalog";

describe("shared semantic visualization index", () => {
  it("is regenerated from the authoritative catalog", () => {
    execFileSync(process.execPath, ["../../scripts/build-interactive-catalog.mjs", "--check"]);
  });
  it.each([
    ["把蜡烛移到凸透镜焦点里面看看像会怎样", "physics.lens-imaging"],
    ["Compare monthly rainfall and temperature in two cities", "geography.climate-comparison"],
    ["Animate bubble sort on an array", "cs.sorting-steps"],
    ["用量角器拖动射线测角度", "math.angle-measure"],
    ["两列简谐波相位改变以后怎样合成", "physics.wave-superposition"],
    ["Show how acid base titration changes pH near equivalence", "chem.acid-base-titration"],
    ["比较有丝分裂和减数分裂中染色体与DNA数量", "biology.cell-division"],
    ["观察半透膜两侧水的渗透方向与体积变化", "biology.osmosis-lab"],
    ["Show a proton moving in a uniform magnetic field", "physics.magnetic-motion"],
    ["用光电效应探索截止频率与遏止电压", "physics.photoelectric-effect"],
    ["探索两个二元一次方程的直线交点与无穷多解", "math.linear-system"],
    ["Compare a quadratic equation's discriminant and complex roots", "math.quadratic-equation"],
    ["向弱酸共轭碱缓冲溶液加入少量强酸观察pH", "chem.weak-acid-buffer"],
  ])("finds %s without requiring a component id", (query, expected) => {
    expect(searchInteractiveComponents({ query, limit: 3 }).map((entry) => entry.componentId)).toContain(expected);
  });
  it("bounds results, respects an explicit discipline, and returns exclusions without configs", () => {
    const result = searchInteractiveComponents({ query: "lens imaging wave graph", discipline: "physics", limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].disciplines).toContain("physics");
    expect(result[0].exclusions.length).toBeGreaterThan(0);
    expect(result[0]).not.toHaveProperty("config");
    expect(searchInteractiveComponents({ query: "", limit: 100 })).toEqual([]);
    expect(searchInteractiveComponents({ query: "lens", discipline: "music" })).toEqual([]);
  });
  it("merges equivalent discipline labels in the large-catalog directory", () => {
    expect(normalizeInteractiveDiscipline("math")).toBe("mathematics");
    expect(normalizeInteractiveDiscipline("数学")).toBe("mathematics");
    expect(formatInteractiveDirectory()).not.toMatch(/^- math:/m);
    expect(formatInteractiveDirectory().match(/^- mathematics:/gm)).toHaveLength(1);
  });
  it("can retrieve every existing component by its bilingual names", () => {
    for (const entry of INTERACTIVE_COMPONENT_CATALOG) {
      expect(searchInteractiveComponents({ query: Object.values(entry.names).join(" "), limit: 10 }).map((result) => result.componentId), entry.componentId).toContain(entry.componentId);
    }
    expect(formatInteractiveDirectory()).toContain("physics:");
  });
});
