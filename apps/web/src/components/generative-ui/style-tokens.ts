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

/** Stylesheet injected into every widget iframe (and standalone exports). The
 * agent prompt speaks this vocabulary — class and variable names only — so
 * design changes happen here without touching or re-tuning any prompt. The
 * names mentioned in apps/agent/src/graph.mjs are guarded by
 * tests/style-vocabulary.spec.ts. */
export const LEARNING_OBJECT_CSS = `
:root {
  --lo-page: ${LO_PAGE};
  --lo-canvas: ${LO_CANVAS};
  --lo-border: ${LO_BORDER};
  --lo-ink: ${LO_INK};
  --lo-muted: ${LO_MUTED};
  --lo-grid: ${LO_GRID};
  --lo-stage: ${LO_STAGE};
  --lo-highlight: ${LO_HIGHLIGHT};
  --series-amber: ${SERIES.amber.stroke};
  --series-amber-fill: ${SERIES.amber.fill};
  --series-pine: ${SERIES.pine.stroke};
  --series-pine-fill: ${SERIES.pine.fill};
  --series-lavender: ${SERIES.lavender.stroke};
  --series-lavender-fill: ${SERIES.lavender.fill};
  --series-rose: ${SERIES.rose.stroke};
  --series-rose-fill: ${SERIES.rose.fill};
}
.lo-stage { background: ${LO_STAGE}; border-radius: 24px; padding: 32px 24px; text-align: center; }
.lo-card {
  background: ${LO_STAGE_OBJECT}; color: ${LO_INK};
  border: 3px solid transparent; border-radius: 10px;
  padding: 10px 14px; font-weight: 700; font: inherit;
  box-shadow: 0 4px 0 rgba(16, 49, 42, 0.45); cursor: pointer; user-select: none;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
}
.lo-card:hover { transform: translateY(-2px); box-shadow: 0 6px 0 rgba(16, 49, 42, 0.45); }
.lo-card:focus-visible { outline: 3px solid ${LO_HIGHLIGHT}; outline-offset: 2px; }
.lo-selected { border-color: ${LO_HIGHLIGHT} !important; background: ${LO_SELECTED_TINT} !important; }
.lo-drop { border: 2px dashed ${LO_STAGE_BORDER}; border-radius: 10px; min-height: 44px; }
.lo-btn {
  background: transparent; border: 1.5px solid ${LO_STAGE_BORDER}; color: #f2faf6;
  border-radius: 999px; padding: 7px 20px; font-weight: 600; font: inherit; cursor: pointer;
}
.lo-btn:hover { border-color: ${LO_HIGHLIGHT}; color: #ffffff; }
.lo-correct { border-color: ${LO_CORRECT.stroke} !important; background: ${LO_CORRECT.fill} !important; }
.lo-wrong { border-color: ${LO_WRONG.stroke} !important; background: ${LO_WRONG.fill} !important; }
.lo-disabled {
  color: ${LO_DISABLED.stroke} !important; background: ${LO_DISABLED.fill} !important;
  box-shadow: none !important; cursor: default; pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .lo-card { transition: none; }
  .lo-card:hover { transform: none; }
}
`;

/** Palette global injected into widget iframes for canvas/THREE code that
 * cannot use CSS — the prompt tells the model to read PRIMORIA.* instead of
 * hardcoding hex values. */
export const PRIMORIA_PALETTE_JS = `window.PRIMORIA = Object.freeze({
  page: "${LO_PAGE}", canvas: "${LO_CANVAS}", ink: "${LO_INK}", muted: "${LO_MUTED}",
  grid: "${LO_GRID}", stage: "${LO_STAGE}", highlight: "${LO_HIGHLIGHT}",
  amber: "${SERIES.amber.stroke}", amberFill: "${SERIES.amber.fill}",
  pine: "${SERIES.pine.stroke}", pineFill: "${SERIES.pine.fill}",
  lavender: "${SERIES.lavender.stroke}", lavenderFill: "${SERIES.lavender.fill}",
  rose: "${SERIES.rose.stroke}", roseFill: "${SERIES.rose.fill}",
  correct: "${LO_CORRECT.stroke}", correctFill: "${LO_CORRECT.fill}",
  wrong: "${LO_WRONG.stroke}", wrongFill: "${LO_WRONG.fill}"
});`;
