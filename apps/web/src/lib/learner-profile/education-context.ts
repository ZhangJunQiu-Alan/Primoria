import type { LearnerCurriculumContext } from "@/lib/knowledge-graph/curriculum-routing";
import type {
  EducationCurriculum,
  EducationStage,
  KnowledgeBackground,
  LearnerProfile,
} from "./types";

export type SuggestedCurriculumRegion = "mainland_china" | "singapore" | "international";

export const EDUCATION_STAGE_LABELS: Record<EducationStage, string> = {
  middle_school: "Middle school",
  high_school: "High school",
  undergraduate: "University",
  graduate: "Graduate",
  professional: "Professional",
  other: "Other",
};

export const EDUCATION_CURRICULUM_LABELS: Record<EducationCurriculum, string> = {
  mainland_china_junior_secondary: "China junior high",
  mainland_china_senior_high: "China senior high",
  singapore_lower_secondary: "SG Lower Secondary",
  singapore_secondary_g2_g3: "SG G2 / G3",
  singapore_h2: "Singapore H2",
  cambridge_international_a_level: "A Level",
  course_specific: "Course-specific",
  self_directed: "Self-directed",
};

const VALID_CURRICULA_BY_STAGE: Record<EducationStage, readonly EducationCurriculum[]> = {
  middle_school: [
    "mainland_china_junior_secondary",
    "singapore_lower_secondary",
    "singapore_secondary_g2_g3",
    "course_specific",
  ],
  high_school: [
    "mainland_china_senior_high",
    "singapore_h2",
    "cambridge_international_a_level",
    "course_specific",
  ],
  undergraduate: ["course_specific"],
  graduate: ["course_specific"],
  professional: ["course_specific"],
  other: ["self_directed", "course_specific"],
};

export function isCurriculumValidForStage(stage: EducationStage, curriculum: EducationCurriculum): boolean {
  return VALID_CURRICULA_BY_STAGE[stage].includes(curriculum);
}

const SINGLE_CURRICULUM_STAGES: Partial<Record<EducationStage, readonly EducationCurriculum[]>> = {
  undergraduate: ["course_specific"],
  graduate: ["course_specific"],
  professional: ["course_specific"],
};

export function curriculumOptionsForStage(
  stage: EducationStage,
  region: SuggestedCurriculumRegion,
): readonly EducationCurriculum[] {
  const single = SINGLE_CURRICULUM_STAGES[stage];
  if (single) return single;
  if (stage === "other") return VALID_CURRICULA_BY_STAGE.other;
  if (stage === "middle_school") {
    if (region === "mainland_china") return ["mainland_china_junior_secondary"];
    if (region === "singapore") return ["singapore_lower_secondary", "singapore_secondary_g2_g3"];
    return VALID_CURRICULA_BY_STAGE.middle_school;
  }
  if (region === "mainland_china") return ["mainland_china_senior_high"];
  if (region === "singapore") return ["singapore_h2", "cambridge_international_a_level"];
  return VALID_CURRICULA_BY_STAGE.high_school;
}

export function suggestEducationCurriculum(
  stage: EducationStage,
  region: SuggestedCurriculumRegion,
): EducationCurriculum | null {
  const options = curriculumOptionsForStage(stage, region);
  return options.length === 1 ? options[0] : null;
}

export function knowledgeBackgroundFromEducationStage(stage: EducationStage): KnowledgeBackground | null {
  if (stage === "middle_school" || stage === "high_school" || stage === "undergraduate" || stage === "graduate") {
    return stage;
  }
  return null;
}

export function curriculumContextFromProfile(
  profile: Pick<LearnerProfile, "curriculumSystem" | "educationContextConfirmedAt"> | null,
): LearnerCurriculumContext | null | undefined {
  if (!profile?.educationContextConfirmedAt) return undefined;
  switch (profile.curriculumSystem) {
    case "mainland_china_senior_high":
      return { system: "mainland_china_senior_high", region: "mainland_china" };
    case "mainland_china_junior_secondary":
      return { system: "mainland_china_junior_secondary", region: "mainland_china" };
    case "singapore_h2":
      return { system: "singapore_h2", region: "singapore" };
    case "singapore_lower_secondary":
      return { system: "singapore_lower_secondary", region: "singapore" };
    case "singapore_secondary_g2_g3":
      return { system: "singapore_secondary_g2_g3", region: "singapore" };
    case "cambridge_international_a_level":
      return { system: "cambridge_international_a_level", region: "international" };
    default:
      return null;
  }
}
