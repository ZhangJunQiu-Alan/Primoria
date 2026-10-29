import { createHash } from "node:crypto";
import { isMaterialGraphId } from "@/lib/materials/types";
import type { Course } from "./types";

/** Bump to give every course a fresh cover after a cover-style change. */
export const COURSE_COVER_STYLE_VERSION = "cover-v1";

/** The library's line-art house style, matching the onboarding and home
 * illustrations: ink outlines on gridded cream paper, a few muted flat fills. */
export const COURSE_COVER_STYLE = [
  "Style: minimal editorial line illustration. Thin, even, dark ink outlines (#1E1B16) with round line caps, drawn on warm cream paper (#F8F3E9) with a faint square grid (#E8E3D9).",
  "Use sparse flat fills only in muted olive (#9E9E77), ochre (#D29C38), slate blue (#5E7F96) and warm taupe (#B7A693); most shapes stay unfilled.",
  "Add one or two accents of dotted arcs or dashed guide lines.",
  "No gradients, shadows, textures, 3D, photorealism or people.",
].join(" ");

export type CourseCoverSource = Pick<Course, "title" | "topic" | "graphId" | "scopeKey" | "lessons">;

/** Material courses draw on the learner's private uploads, so they never get a
 * generated cover (the private media channel stays lesson-only); the library
 * shows its deterministic line-art cover instead. */
export function courseCoverEligible(course: Pick<Course, "graphId">): boolean {
  return !isMaterialGraphId(course.graphId);
}

/** Media-asset cache key of a course's cover, derived from the course itself so
 * the library can look covers up without a column. Courses on the same learning
 * scope (e.g. every learner's canonical linear-algebra course) share one
 * picture, whatever their per-intake preparation suffix; scope-less courses
 * fall back to their normalized title. Covers carry no text, so the key
 * ignores language. */
export function courseCoverCacheKey(course: Pick<Course, "title" | "graphId" | "scopeKey">): string | null {
  if (!courseCoverEligible(course)) return null;
  const basis = course.scopeKey?.trim().replace(/:prep:.*$/, "")
    || `title:${course.title.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim()}`;
  const digest = createHash("sha256").update(basis).digest("hex").slice(0, 32);
  return `course-cover:${COURSE_COVER_STYLE_VERSION}:${digest}`;
}

const MAX_PROMPT_LESSONS = 6;

/** One image prompt per course: what the course covers plus the house style.
 * Course content only, never learner facts: covers are shared across learners. */
export function buildCourseCoverPrompt(course: CourseCoverSource): string {
  const lessonTitles = [...course.lessons]
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((lesson) => lesson.title.trim())
    .filter(Boolean)
    .slice(0, MAX_PROMPT_LESSONS);
  const topic = course.topic.trim();
  return [
    "Draw the cover illustration for an online course.",
    `Course: ${course.title.trim()}${topic && topic !== course.title.trim() ? ` (${topic})` : ""}.`,
    lessonTitles.length ? `It covers: ${lessonTitles.join("; ")}.` : "",
    "Show one or two simple symbolic objects or diagrams a learner would associate with this subject (instruments, geometric figures, apparatus, specimens, artefacts or curves), arranged as a calm still life rather than a scene.",
    COURSE_COVER_STYLE,
    "Composition: centred, the subject fills about half the frame, generous empty margins, keep the top-left corner empty.",
    "Absolutely no text: no letters, words, numbers, equations, labels, logos or watermarks.",
    "Aspect ratio: 16:9.",
  ].filter(Boolean).join("\n");
}
