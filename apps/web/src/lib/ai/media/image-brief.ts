import { createHash } from "node:crypto";
import { FLAT_VECTOR_IMAGE_STYLE, LEARNING_OBJECT_STYLE_VERSION } from "@primoria/contracts/visual-style";

export type ImageKind =
  | "educational_illustration"
  | "structure_diagram"
  | "realistic_scene"
  | "analogy_illustration";

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
  styleVersion?: string;
  language?: string;
};

/** Bump to invalidate every cached asset after a house-style change. */
export const STYLE_VERSION = LEARNING_OBJECT_STYLE_VERSION;
export const DEFAULT_LANGUAGE = "en";

/** Primoria learning-object house style: flat vector for the
 * illustration kinds, photographic only for realistic_scene. Palette words match
 * the widget tokens so images and widgets read as one product. */
const STYLE_BY_KIND: Record<ImageKind, string> = {
  educational_illustration: FLAT_VECTOR_IMAGE_STYLE,
  analogy_illustration: `${FLAT_VECTOR_IMAGE_STYLE} One focal visual metaphor, a single scene, minimal props.`,
  structure_diagram: `${FLAT_VECTOR_IMAGE_STYLE} Schematic composition, at most five objects connected by clear arrows or dashed lines, generous spacing between elements.`,
  realistic_scene:
    "Style: natural photographic rendering, warm soft daylight, one clear subject, uncluttered neutral background, true-to-life color.",
};

/** Assembles the text prompt sent to the image model from a brief. Enforces the
 * house constraint that AI images never carry text/labels/formulas — those
 * belong in `visual` blocks or a structured overlay, not a generated raster. */
export function buildImagePrompt(brief: ImageBrief): string {
  const lines = [
    brief.prompt.trim(),
    STYLE_BY_KIND[brief.imageKind],
    "Do not render any text, words, numbers, labels, axis ticks, formulas, or chemical notation inside the image.",
    "Aspect ratio: 16:9.",
  ];
  if (brief.negativePrompt?.trim()) lines.push(`Avoid: ${brief.negativePrompt.trim()}.`);
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
    aspectRatio: "16:9",
    language: brief.language ?? DEFAULT_LANGUAGE,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
