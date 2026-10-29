import { describe, expect, it } from "vitest";

import {
  curriculumContextFromProfile,
  curriculumOptionsForStage,
  isCurriculumValidForStage,
  suggestEducationCurriculum,
} from "../src/lib/learner-profile/education-context";

describe("onboarding education context", () => {
  it("requires a curriculum choice whenever the stage has multiple candidates", () => {
    expect(suggestEducationCurriculum("high_school")).toBeNull();
    expect(suggestEducationCurriculum("middle_school")).toBeNull();
    expect(suggestEducationCurriculum("other")).toBeNull();
    for (const stage of ["undergraduate", "graduate", "professional"] as const) {
      expect(suggestEducationCurriculum(stage)).toBe("course_specific");
    }
  });

  it("offers every valid school curriculum without region filtering", () => {
    expect(curriculumOptionsForStage("middle_school")).toEqual([
      "mainland_china_junior_secondary",
      "singapore_lower_secondary",
      "singapore_secondary_g2_g3",
      "course_specific",
    ]);
    expect(curriculumOptionsForStage("high_school")).toEqual([
      "mainland_china_senior_high",
      "singapore_h2",
      "cambridge_international_a_level",
      "course_specific",
    ]);
    expect(curriculumOptionsForStage("other")).toEqual(["self_directed", "course_specific"]);
  });

  it("rejects stage and curriculum combinations the UI cannot produce", () => {
    expect(isCurriculumValidForStage("high_school", "singapore_h2")).toBe(true);
    expect(isCurriculumValidForStage("middle_school", "singapore_h2")).toBe(false);
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
