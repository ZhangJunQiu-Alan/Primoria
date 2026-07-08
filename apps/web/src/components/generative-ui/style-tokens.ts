/** Primoria learning-object style tokens (STYLE_VERSION v2).
 *
 * Single source of truth for the visualization renderers. The same values are
 * spelled out as prose in the tool descriptions in `apps/agent/src/graph.mjs`
 * and in the image style clauses in `src/lib/ai/media/image-brief.ts` — keep
 * all three in sync when the house style changes.
 */

export const LO_CANVAS = "#ffffff";
export const LO_PAGE = "#fbf7ee";
export const LO_BORDER = "#e7dfd0";
export const LO_INK = "#29241c";
export const LO_MUTED = "#6b6357";
export const LO_GRID = "#efece4";

/** Deep pine stage for manipulable interactives; mint marks highlight/selected. */
export const LO_STAGE = "#1e4d40";
export const LO_STAGE_DEEP = "#10312a";
export const LO_STAGE_OBJECT = "#fffdf6";
export const LO_STAGE_BORDER = "#7eae9d";
export const LO_HIGHLIGHT = "#7ed6ae";
export const LO_SELECTED_TINT = "#e2f6ee";

/** Chart series: pale fill + 2px darker same-hue stroke. Order: amber, pine, lavender, rose.
 * "sage" is the legacy group name for pine and must keep resolving. */
export const SERIES_FILLS = ["#fbeed3", "#dcede3", "#e6e0f6", "#f9e3ea"] as const;
export const SERIES_STROKES = ["#a66f10", "#2e6b52", "#6a55c4", "#a64d64"] as const;
export const SERIES = {
  amber: { fill: "#fbeed3", stroke: "#a66f10" },
  pine: { fill: "#dcede3", stroke: "#2e6b52" },
  sage: { fill: "#dcede3", stroke: "#2e6b52" },
  lavender: { fill: "#e6e0f6", stroke: "#6a55c4" },
  rose: { fill: "#f9e3ea", stroke: "#a64d64" },
} as const;

/** Semantic states are reserved — never used for data series. */
export const LO_CORRECT = { fill: "#e3f2e8", stroke: "#2e7d4f" } as const;
export const LO_WRONG = { fill: "#fbeae6", stroke: "#c2452f" } as const;
export const LO_DISABLED = { fill: "#f1ede4", stroke: "#b0a99c" } as const;
