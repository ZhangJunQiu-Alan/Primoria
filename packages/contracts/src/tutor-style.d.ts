export type TutorStyle = "socratic" | "feynman" | "euclid";

export declare const TUTOR_STYLES: readonly ["socratic", "feynman", "euclid"];
export declare const DEFAULT_TUTOR_STYLE: "feynman";

export declare function isTutorStyle(value: unknown): value is TutorStyle;
export declare function resolveTutorStyle(value: unknown): TutorStyle;
export declare function formatTutorStylePrompt(value: unknown): string;
