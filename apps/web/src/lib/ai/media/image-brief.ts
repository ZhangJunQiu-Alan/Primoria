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

/** Assembles a teaching-focused image prompt, including legible instructional
 * text when it helps explain the concept. */
export function buildImagePrompt(brief: ImageBrief): string {
  const lines = [
    brief.prompt.trim(),
    STYLE_BY_KIND[brief.imageKind],
    `Teaching goal: ${brief.learningGoal.trim()}`,
    "Prioritize factual accuracy and a clear explanation of this concept. Include labels, arrows, numbers, formulas, chemical notation, or short explanations when they improve understanding; omit text that adds no teaching value.",
    `Use the teaching language \"${brief.language?.trim() || DEFAULT_LANGUAGE}\" for instructional text. Render any exact label text specified in the brief verbatim. Keep text accurate, concise, readable at lesson-column width, and clearly associated with the relevant structure or step. Avoid overlapping labels, tiny text, decorative prose, and watermarks.`,
    "Aspect ratio: 16:9.",
  ];
  if (brief.negativePrompt?.trim()) lines.push(`Avoid: ${brief.negativePrompt.trim()}.`);
  return lines.join("\n");
}

/** Stable reuse key, shared by every learner and every image model: one
 * canonical image per concept set + house style + language, so a concept's image
 * is generated once (by a lesson or an offline pre-warm with any model) and every
 * later lesson reuses it with that asset's own kind/alt/caption. Language stays
 * in the key because the reused alt/caption are written in it. Analogy
 * illustrations draw the lesson's own analogy, so they stay keyed by kind and
 * learning goal, and an image with no concept (an editor-added block) is keyed
 * by its own brief so unrelated pictures never share one slot. conceptIds are
 * sorted so ordering never forks the cache. */
/** Primary language subtag for the cache key: "zh-CN", "zh_Hans" and "zh" share
 * one Chinese asset, and unset means the default language. */
export function imageLanguage(language: string | null | undefined): string {
  const primary = language?.trim().toLowerCase().split(/[-_]/)[0];
  return primary || DEFAULT_LANGUAGE;
}

export function imageCacheKey(brief: ImageBrief): string {
  const conceptIds = [...brief.conceptIds].map((id) => id.trim()).sort();
  const unanchored = conceptIds.length === 0;
  const canonical = {
    conceptIds,
    styleVersion: brief.styleVersion ?? STYLE_VERSION,
    aspectRatio: "16:9",
    language: imageLanguage(brief.language),
    ...(brief.imageKind === "analogy_illustration" || unanchored
      ? { imageKind: brief.imageKind, learningGoal: brief.learningGoal.trim() }
      : {}),
    ...(unanchored ? { prompt: brief.prompt.trim() } : {}),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
