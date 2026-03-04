// CoursePlanJson — Milestone 2 AI Agentic Course Builder
//
// Returned by POST /ai/plan-course.
// Stored in courses.planning_json after the course row is created.
// Phase 2C (generate-lesson-blocks) reads lesson.objective and
// lesson.key_points from this JSON by matching lesson.order.

export type SubjectName =
  | "Mathematics"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "Computer Science"
  | "Engineering"
  | "Data Science & AI"
  | "Earth & Space Science";

export type AnimationStyle  = "cartoon" | "minimal" | "realistic";
export type Difficulty      = "beginner" | "intermediate" | "advanced";
export type LessonType      = "interactive" | "quiz" | "video" | "article";
export type ContentLanguage = "zh" | "en";

export interface CoursePlanLesson {
  /** 1-based order. Written to lessons.sort_key as order × 1000. */
  order:             number;
  title:             string;
  /** Learning objective for this lesson. Injected into Phase 2C prompt. */
  objective:         string;
  /** 3–6 key concepts. Injected into Phase 2C prompt. */
  key_points:        string[];
  type:              LessonType;
  /** Written to lessons.duration_seconds as estimated_minutes × 60. */
  estimated_minutes: number;
  /** Written to lessons.xp_reward directly. */
  xp_reward:         number;
}

export interface CoursePlanCourse {
  title:                   string;
  description:             string;
  /** AI must choose from SubjectName enum; mapped to courses.subject_id via name lookup. */
  subject:                 SubjectName;
  difficulty:              Difficulty;
  target_audience:         string;
  /** Written to courses.estimated_minutes. */
  estimated_total_minutes: number;
  tags:                    string[];
  /** Written to courses.animation_style. */
  animation_style:         AnimationStyle;
  /** Written to courses.content_language. */
  language:                ContentLanguage;
}

export interface CoursePlanJson {
  schema_version: "plan-1.0";
  course:  CoursePlanCourse;
  lessons: CoursePlanLesson[];
}

// ── Phase 2C output ──────────────────────────────────────────────────
// Returned by POST /ai/generate-lesson-blocks (one per lesson).
// Phase 2D (buildCourseJson) assembles these into the final Course JSON lessons[].

export interface LessonBlock {
  type:      string;
  id:        string;
  position?: { order: number };
  style?:    { spacing?: string; alignment?: string };
  content:   Record<string, unknown>;
  [key: string]: unknown;
}

export interface LessonJson {
  /** Maps to lessons[].title in the final Course JSON. */
  lessonTitle: string;
  blocks:      LessonBlock[];
}
