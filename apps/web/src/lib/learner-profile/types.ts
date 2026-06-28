export const KNOWLEDGE_BACKGROUNDS = ["high_school", "undergraduate", "graduate"] as const;
export type KnowledgeBackground = (typeof KNOWLEDGE_BACKGROUNDS)[number];

export const TUTOR_STYLES = ["socratic", "feynman", "euclid"] as const;
export type TutorStyle = (typeof TUTOR_STYLES)[number];

export type OnboardingStep = "goal" | "background" | "style" | "done";

export type LearnerProfile = {
  ownerId: string;
  learningGoal: string | null;
  goalGraphId: string | null;
  goalStartTopicId: string | null;
  goalTargetConceptId: string | null;
  goalSkippedAt: string | null;
  knowledgeBackground: KnowledgeBackground | null;
  knowledgeBackgroundSkippedAt: string | null;
  tutorStyle: TutorStyle | null;
  tutorStyleSkippedAt: string | null;
  onboardingCompletedAt: string | null;
  onboardingSkippedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LearnerOnboardingState = {
  profile: LearnerProfile | null;
  nextStep: OnboardingStep;
  complete: boolean;
};

export function isKnowledgeBackground(value: unknown): value is KnowledgeBackground {
  return typeof value === "string" && (KNOWLEDGE_BACKGROUNDS as readonly string[]).includes(value);
}

export function isTutorStyle(value: unknown): value is TutorStyle {
  return typeof value === "string" && (TUTOR_STYLES as readonly string[]).includes(value);
}

export function knowledgeBackgroundLabel(value: KnowledgeBackground | null | undefined) {
  switch (value) {
    case "high_school":
      return "High school";
    case "undergraduate":
      return "University";
    case "graduate":
      return "Graduate";
    default:
      return "Unspecified";
  }
}

export function tutorStyleLabel(value: TutorStyle | null | undefined) {
  switch (value) {
    case "socratic":
      return "Socratic";
    case "feynman":
      return "Feynman";
    case "euclid":
      return "Euclid";
    default:
      return "Feynman";
  }
}

export function knowledgeBackgroundDirective(value: KnowledgeBackground | null | undefined) {
  switch (value) {
    case "high_school":
      return "LEARNER BACKGROUND: High school. Avoid assuming university-level prerequisites. Teach with concrete intuition, plain language, and short prerequisite refreshers before formal notation.";
    case "undergraduate":
      return "LEARNER BACKGROUND: University. Use standard undergraduate terminology, moderate rigor, and worked examples. Explain prerequisites only when they directly affect this topic.";
    case "graduate":
      return "LEARNER BACKGROUND: Graduate. Move faster, use precise definitions and notation, and emphasize structure, edge cases, and deeper connections.";
    default:
      return "LEARNER BACKGROUND: Unspecified. Use an accessible undergraduate baseline and adapt from the mastery tags; do not assume advanced prerequisites unless the topic requires them.";
  }
}

export function tutorStyleDirective(value: TutorStyle | null | undefined) {
  switch (value) {
    case "socratic":
      return "Tutor style: Socratic. Prefer guiding questions, checks for understanding, and short hints before direct answers. Help the learner reason their way to the idea.";
    case "euclid":
      return "Tutor style: Euclid. Be precise, structured, and rigorous. State definitions and conditions clearly, then build the explanation step by step.";
    case "feynman":
    default:
      return "Tutor style: Feynman. Explain with intuition, simple language, analogies, and concrete examples before formal details.";
  }
}
