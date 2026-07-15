import { describe, expect, it } from "vitest";

import { canViewInternalAnalytics } from "../src/lib/telemetry/internal-access";
import {
  aggregateVisualizationEvents,
  normalizeVisualizationTopic,
} from "../src/lib/telemetry/visualization-analytics";

const user = { id: "user-1", displayName: "Internal", avatarUrl: null, email: "team@primoria.test" };

describe("visualization analytics", () => {
  it("clusters command variants and calculates component success rates", () => {
    const report = aggregateVisualizationEvents(
      [
        { source: "sandbox", topic: "请演示一下火山喷发", componentId: null, status: "rendered" },
        { source: "sandbox", topic: "展示火山喷发", componentId: null, status: "script_error" },
        { source: "interactive", topic: "凸透镜", componentId: "physics.lens-imaging", status: "rendered" },
        { source: "interactive", topic: "凸透镜", componentId: "physics.lens-imaging", status: "api_error" },
      ],
      { days: 28, generatedAt: new Date("2026-07-15T00:00:00Z") },
    );

    expect(normalizeVisualizationTopic("Please visualize the lens")).toBe("lens");
    expect(report.sandboxClusters).toHaveLength(1);
    expect(report.sandboxClusters[0]).toMatchObject({ topic: "火山喷发", attempts: 2, rendered: 1, failed: 1 });
    expect(report.interactiveComponents[0]).toMatchObject({
      componentId: "physics.lens-imaging",
      attempts: 2,
      successRate: 0.5,
    });
  });

  it("fails closed in production unless the user is allowlisted", () => {
    expect(canViewInternalAnalytics(user, { nodeEnv: "development" })).toBe(true);
    expect(canViewInternalAnalytics(user, { nodeEnv: "production", enabled: "1", allowedEmails: "team@primoria.test" })).toBe(true);
    expect(canViewInternalAnalytics(user, { nodeEnv: "production", enabled: "1", allowedEmails: "other@primoria.test" })).toBe(false);
  });
});
