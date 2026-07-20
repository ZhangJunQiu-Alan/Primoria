import { describe, expect, it } from "vitest";

import { getSuggestedCurriculumRegion, suggestedCurriculumRegion } from "../src/lib/learner-profile/curriculum-suggestion";
import {
  curriculumContextFromProfile,
  curriculumOptionsForStage,
  isCurriculumValidForStage,
  suggestEducationCurriculum,
} from "../src/lib/learner-profile/education-context";

describe("onboarding education context", () => {
  it("auto-suggests only when region and stage leave one curriculum candidate", () => {
    expect(suggestEducationCurriculum("high_school", "mainland_china")).toBe("mainland_china_senior_high");
    expect(suggestEducationCurriculum("middle_school", "mainland_china")).toBe("mainland_china_junior_secondary");
    expect(suggestEducationCurriculum("high_school", "singapore")).toBeNull();
    expect(suggestEducationCurriculum("middle_school", "singapore")).toBeNull();
    expect(suggestEducationCurriculum("high_school", "international")).toBeNull();
  });

  it("offers the two Singapore choices instead of silently choosing one", () => {
    expect(curriculumOptionsForStage("middle_school", "singapore")).toEqual([
      "singapore_lower_secondary",
      "singapore_secondary_g2_g3",
    ]);
    expect(curriculumOptionsForStage("high_school", "singapore")).toEqual([
      "singapore_h2",
      "cambridge_international_a_level",
    ]);
  });

  it("rejects stage and curriculum combinations the UI cannot produce", () => {
    expect(isCurriculumValidForStage("high_school", "singapore_h2")).toBe(true);
    expect(isCurriculumValidForStage("middle_school", "singapore_h2")).toBe(false);
  });

  it("turns geo headers into an ephemeral suggestion region only", () => {
    expect(suggestedCurriculumRegion(new Headers({ "cf-ipcountry": "CN" }))).toBe("mainland_china");
    expect(suggestedCurriculumRegion(new Headers({ "x-vercel-ip-country": "SG" }))).toBe("singapore");
    expect(suggestedCurriculumRegion(new Headers({ "accept-language": "en-SG,en;q=0.9" }))).toBe("singapore");
    expect(suggestedCurriculumRegion(new Headers({ "accept-language": "en-US,en;q=0.9" }))).toBe("international");
  });

  it("falls back safely when rendered outside a Next request scope", async () => {
    await expect(getSuggestedCurriculumRegion()).resolves.toBe("international");
  });

  it("routes only from confirmed structured curriculum fields", () => {
    expect(curriculumContextFromProfile({
      curriculumSystem: "singapore_h2",
      educationContextConfirmedAt: null,
    })).toBeUndefined();
    expect(curriculumContextFromProfile({
      curriculumSystem: "singapore_h2",
      educationContextConfirmedAt: "2026-07-20T00:00:00.000Z",
    })).toEqual({ system: "singapore_h2", region: "singapore" });
    expect(curriculumContextFromProfile({
      curriculumSystem: "course_specific",
      educationContextConfirmedAt: "2026-07-20T00:00:00.000Z",
    })).toBeNull();
  });
});
