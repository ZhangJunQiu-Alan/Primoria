import { createHash } from "node:crypto";

export type ImageKind =
  | "educational_illustration"
  | "structure_diagram"
  | "realistic_scene"
  | "analogy_illustration";

export type ImageAspectRatio = "1:1" | "4:3" | "16:9";
export type ImageResolution = "1K" | "2K" | "4K";

/** What an `image` block wants drawn, decided by the Block Writer before any
 * asset exists. The Image Builder turns this into a media asset + final block. */
export type ImageBrief = {
  conceptIds: string[];
  learningGoal: string;
  imageKind: ImageKind;
  prompt: string;
  alt: string;
  caption: string;
  negativePrompt?: string;
  aspectRatio?: ImageAspectRatio;
  resolution?: ImageResolution;
  styleVersion?: string;
  language?: string;
};

/** Bump to invalidate every cached asset after a house-style change. */
export const STYLE_VERSION = "v1";
export const DEFAULT_ASPECT_RATIO: ImageAspectRatio = "4:3";
export const DEFAULT_RESOLUTION: ImageResolution = "1K";
export const DEFAULT_LANGUAGE = "en";

/** Assembles the text prompt sent to the image model from a brief. Enforces the
 * house constraint that AI images never carry text/labels/formulas — those
 * belong in `visual` blocks or a structured overlay, not a generated raster. */
export function buildImagePrompt(brief: ImageBrief): string {
  const lines = [
    brief.prompt.trim(),
    "Style: clean modern educational illustration, clear composition, neutral background.",
    "Do not render any text, words, numbers, labels, axis ticks, formulas, or chemical notation inside the image.",
  ];
  if (brief.negativePrompt?.trim()) lines.push(`Avoid: ${brief.negativePrompt.trim()}.`);
  if (brief.aspectRatio) lines.push(`Aspect ratio: ${brief.aspectRatio}.`);
  return lines.join("\n");
}

/** Stable reuse key. Hashes the brief's *semantics* — not the rendered prompt
 * text — so reworded prompts for the same concept/goal/style still reuse one
 * asset. conceptIds are sorted so ordering never forks the cache. */
export function imageCacheKey(brief: ImageBrief, model: string): string {
  const canonical = {
    model,
    conceptIds: [...brief.conceptIds].map((id) => id.trim()).sort(),
    learningGoal: brief.learningGoal.trim(),
    imageKind: brief.imageKind,
    styleVersion: brief.styleVersion ?? STYLE_VERSION,
    aspectRatio: brief.aspectRatio ?? DEFAULT_ASPECT_RATIO,
    resolution: brief.resolution ?? DEFAULT_RESOLUTION,
    language: brief.language ?? DEFAULT_LANGUAGE,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
