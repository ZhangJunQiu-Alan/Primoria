import { afterEach, describe, expect, it } from "vitest";

import { contentTierSettings } from "../src/lib/ai/deepagent/model";
import { usesContentQualityTier } from "../src/lib/interactive/configure";

const previousContentModel = process.env.AI_MODEL_CONTENT;

afterEach(() => {
  if (previousContentModel === undefined) delete process.env.AI_MODEL_CONTENT;
  else process.env.AI_MODEL_CONTENT = previousContentModel;
});

describe("interactive content quality tier", () => {
  it("keeps historical source content off the fast tier", () => {
    expect(usesContentQualityTier("general.timeline-causality")).toBe(true);
    expect(usesContentQualityTier("humanities.source-comparison")).toBe(true);
    expect(usesContentQualityTier("physics.lens-imaging")).toBe(false);
  });

  it("uses AI_MODEL_CONTENT when configured and otherwise leaves the default unpinned", () => {
    delete process.env.AI_MODEL_CONTENT;
    expect(contentTierSettings()).toEqual({});
    process.env.AI_MODEL_CONTENT = "quality-model";
    expect(contentTierSettings()).toEqual({ model: "quality-model" });
  });
});
