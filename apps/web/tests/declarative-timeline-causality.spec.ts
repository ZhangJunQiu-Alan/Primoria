import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMELINE_CAUSALITY_CONFIG,
  TimelineCausalityConfigSchema,
  TimelineCausalityPatchSchema,
  deriveTimelineCausality,
} from "../src/lib/interactive/components/timeline-causality";

describe("deriveTimelineCausality", () => {
  it("derives incoming and outgoing causal counts in event order", () => {
    const result = deriveTimelineCausality(DEFAULT_TIMELINE_CAUSALITY_CONFIG);
    expect(result.events.map((event) => [event.order, event.incoming, event.outgoing])).toEqual([
      [1, 0, 1],
      [2, 1, 1],
      [3, 1, 0],
    ]);
    expect(result.validLinks).toHaveLength(2);
    expect(result.invalidLinks).toHaveLength(0);
  });

  it("isolates dangling and self-referential links instead of leaking them into counts", () => {
    const config = TimelineCausalityConfigSchema.parse({
      causalLinks: [
        { fromEventId: "event-1", toEventId: "missing", explanation: "dangling" },
        { fromEventId: "event-2", toEventId: "event-2", explanation: "self" },
      ],
    });
    const result = deriveTimelineCausality(config);
    expect(result.validLinks).toHaveLength(0);
    expect(result.invalidLinks).toHaveLength(2);
    expect(result.events.every((event) => event.incoming === 0 && event.outgoing === 0)).toBe(true);
  });
});

describe("TimelineCausality schemas", () => {
  it("fills defaults and rejects invalid collection bounds", () => {
    expect(DEFAULT_TIMELINE_CAUSALITY_CONFIG.events).toHaveLength(3);
    expect(DEFAULT_TIMELINE_CAUSALITY_CONFIG.causalLinks).toHaveLength(2);
    expect(TimelineCausalityConfigSchema.safeParse({ events: [DEFAULT_TIMELINE_CAUSALITY_CONFIG.events[0]] }).success).toBe(false);
    expect(TimelineCausalityConfigSchema.safeParse({ causalLinks: [] }).success).toBe(false);
  });

  it("accepts minimal field patches and rejects malformed values", () => {
    expect(TimelineCausalityPatchSchema.parse({ timelineTitle: "A revolution" })).toEqual({ timelineTitle: "A revolution" });
    expect(TimelineCausalityPatchSchema.safeParse({ timelineTitle: "" }).success).toBe(false);
  });
});
