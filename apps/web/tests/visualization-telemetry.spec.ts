import { describe, expect, it } from "vitest";
import { toRow } from "../src/lib/learning-events/store";

describe("visualization.render learning event", () => {
  it("maps telemetry fields into the payload and keeps caller-supplied ids", () => {
    const row = toRow({
      type: "visualization.render",
      ownerId: "user-1",
      id: "viz_abc123",
      source: "sandbox",
      topic: "抛体运动演示",
      status: "script_error",
      detail: "Blocked non-whitelisted dependency",
    });
    expect(row.id).toBe("viz_abc123");
    expect(row.type).toBe("visualization.render");
    expect(row.payload).toEqual({
      source: "sandbox",
      topic: "抛体运动演示",
      status: "script_error",
      detail: "Blocked non-whitelisted dependency",
    });
  });

  it("records interactive hits with componentId and omits empty optionals", () => {
    const row = toRow({
      type: "visualization.render",
      ownerId: "user-1",
      source: "interactive",
      topic: "凸透镜成像",
      componentId: "physics.lens-imaging",
      status: "rendered",
    });
    expect(row.payload).toEqual({
      source: "interactive",
      topic: "凸透镜成像",
      status: "rendered",
      component_id: "physics.lens-imaging",
    });
  });
});
