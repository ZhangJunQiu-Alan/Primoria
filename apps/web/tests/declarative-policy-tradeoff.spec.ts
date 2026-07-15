import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY_TRADEOFF_CONFIG, derivePolicyTradeoff, PolicyTradeoffConfigSchema, PolicyTradeoffPatchSchema } from "../src/lib/qa/components/policy-tradeoff";

describe("policy tradeoff component", () => {
  it("validates defaults, patches, and importance bounds", () => {
    expect(PolicyTradeoffConfigSchema.parse({})).toEqual(DEFAULT_POLICY_TRADEOFF_CONFIG);
    expect(PolicyTradeoffPatchSchema.parse({ policyQuestion: "What changes?" })).toEqual({ policyQuestion: "What changes?" });
    expect(() => PolicyTradeoffConfigSchema.parse({ criteria: DEFAULT_POLICY_TRADEOFF_CONFIG.criteria.map((item, index) => index ? item : { ...item, importance: 6 }) })).toThrow();
  });
  it("normalizes criterion importance without choosing a winner", () => {
    const result = derivePolicyTradeoff(DEFAULT_POLICY_TRADEOFF_CONFIG);
    expect(result.weightedCriteria.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1, 8);
    expect(result).not.toHaveProperty("winner");
  });
});
