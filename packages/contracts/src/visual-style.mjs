export const LEARNING_OBJECT_STYLE_VERSION = "v3";

export const LO_CANVAS = "#ffffff";
export const LO_PAGE = "#fbf7ee";
export const LO_BORDER = "#e7dfd0";
export const LO_INK = "#29241c";
export const LO_MUTED = "#6b6357";
export const LO_GRID = "#efece4";

export const LO_STAGE = "#1e4d40";
export const LO_STAGE_DEEP = "#10312a";
export const LO_STAGE_OBJECT = "#fffdf6";
export const LO_STAGE_BORDER = "#7eae9d";
export const LO_HIGHLIGHT = "#7ed6ae";
export const LO_SELECTED_TINT = "#e2f6ee";

export const SERIES = Object.freeze({
  amber: Object.freeze({ fill: "#fbeed3", stroke: "#a66f10" }),
  pine: Object.freeze({ fill: "#dcede3", stroke: "#2e6b52" }),
  sage: Object.freeze({ fill: "#dcede3", stroke: "#2e6b52" }),
  lavender: Object.freeze({ fill: "#e6e0f6", stroke: "#6a55c4" }),
  rose: Object.freeze({ fill: "#f9e3ea", stroke: "#a64d64" }),
});

export const SERIES_NAMES = Object.freeze(["amber", "pine", "lavender", "rose"]);
export const SERIES_FILLS = Object.freeze([
  SERIES.amber.fill,
  SERIES.pine.fill,
  SERIES.lavender.fill,
  SERIES.rose.fill,
]);
export const SERIES_STROKES = Object.freeze([
  SERIES.amber.stroke,
  SERIES.pine.stroke,
  SERIES.lavender.stroke,
  SERIES.rose.stroke,
]);

export const LO_CORRECT = Object.freeze({ fill: "#e3f2e8", stroke: "#2e7d4f" });
export const LO_WRONG = Object.freeze({ fill: "#fbeae6", stroke: "#c2452f" });
export const LO_DISABLED = Object.freeze({ fill: "#f1ede4", stroke: "#b0a99c" });

export const LO_CLASS_DESCRIPTIONS = Object.freeze({
  "lo-stage": "bench for tactile manipulable objects",
  "lo-card": "pickable object with hover lift and hard shadow",
  "lo-selected": "selected or active object state",
  "lo-correct": "correct or success state",
  "lo-wrong": "wrong or error state",
  "lo-disabled": "disabled or unavailable state",
  "lo-drop": "drop target",
  "lo-btn": "button on a stage",
});

export const CSS_VARIABLES = Object.freeze([
  "--lo-page",
  "--lo-canvas",
  "--lo-border",
  "--lo-ink",
  "--lo-muted",
  "--lo-grid",
  "--lo-stage",
  "--lo-highlight",
  "--series-amber",
  "--series-amber-fill",
  "--series-pine",
  "--series-pine-fill",
  "--series-lavender",
  "--series-lavender-fill",
  "--series-rose",
  "--series-rose-fill",
]);

export const PRIMORIA_PALETTE = Object.freeze({
  page: LO_PAGE,
  canvas: LO_CANVAS,
  ink: LO_INK,
  muted: LO_MUTED,
  grid: LO_GRID,
  stage: LO_STAGE,
  highlight: LO_HIGHLIGHT,
  amber: SERIES.amber.stroke,
  amberFill: SERIES.amber.fill,
  pine: SERIES.pine.stroke,
  pineFill: SERIES.pine.fill,
  lavender: SERIES.lavender.stroke,
  lavenderFill: SERIES.lavender.fill,
  rose: SERIES.rose.stroke,
  roseFill: SERIES.rose.fill,
  correct: LO_CORRECT.stroke,
  correctFill: LO_CORRECT.fill,
  wrong: LO_WRONG.stroke,
  wrongFill: LO_WRONG.fill,
});

export const SVG_TEXT_CLASSES = Object.freeze(["t", "ts", "th"]);
export const SVG_STYLE_CLASSES = Object.freeze({
  blue: Object.freeze({ fill: "#e2ecf6", stroke: "#33608f", text: "#264a70" }),
  green: Object.freeze({ fill: SERIES.pine.fill, stroke: SERIES.pine.stroke, text: "#22503d" }),
  amber: Object.freeze({ fill: SERIES.amber.fill, stroke: SERIES.amber.stroke, text: "#7c530c" }),
  coral: Object.freeze({ fill: "#fae9e1", stroke: "#b05a35", text: "#7f3f24" }),
  purple: Object.freeze({ fill: SERIES.lavender.fill, stroke: SERIES.lavender.stroke, text: "#4e3f96" }),
  gray: Object.freeze({ fill: LO_DISABLED.fill, stroke: LO_MUTED, text: "#4f483d" }),
  teal: Object.freeze({ fill: "#e0f2ec", stroke: "#1f7a60", text: "#175c48" }),
  pink: Object.freeze({ fill: SERIES.rose.fill, stroke: SERIES.rose.stroke, text: "#7c394b" }),
  red: Object.freeze({ fill: LO_WRONG.fill, stroke: LO_WRONG.stroke, text: "#93331f" }),
});

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

/**
 * @param {[string, { fill: string, stroke: string, text: string }]} entry
 */
function svgClassCss([name, style]) {
  return `/* ${name} */
svg .c-${name} > rect, svg .c-${name} > circle, svg .c-${name} > ellipse,
svg rect.c-${name}, svg circle.c-${name}, svg ellipse.c-${name} { fill: ${style.fill}; stroke: ${style.stroke}; }
svg .c-${name} text.th, svg .c-${name} text.t { fill: ${style.text}; }
svg .c-${name} text.ts { fill: ${style.stroke}; }`;
}

export const SVG_CLASSES_CSS = `
svg text.t   { font: 400 14px var(--font-sans); fill: var(--p); }
svg text.ts  { font: 400 12px var(--font-sans); fill: var(--s); }
svg text.th  { font: 700 14px var(--font-sans); fill: var(--p); }
svg .box > rect, svg .box > circle, svg .box > ellipse { fill: var(--bg2); stroke: var(--b); }
svg .node { cursor: pointer; }
svg .node:hover { opacity: 0.86; }
svg .arr { stroke: var(--s); stroke-width: 1.5; fill: none; }
svg .leader { stroke: var(--t); stroke-width: 0.5; stroke-dasharray: 4 4; fill: none; }

/* Learning-object series pairs: pale fill plus darker same-hue stroke. */
${Object.entries(SVG_STYLE_CLASSES).map(svgClassCss).join("\n\n")}
`;

export const PRIMORIA_PALETTE_JS = `window.PRIMORIA = Object.freeze({
  page: "${PRIMORIA_PALETTE.page}", canvas: "${PRIMORIA_PALETTE.canvas}", ink: "${PRIMORIA_PALETTE.ink}", muted: "${PRIMORIA_PALETTE.muted}",
  grid: "${PRIMORIA_PALETTE.grid}", stage: "${PRIMORIA_PALETTE.stage}", highlight: "${PRIMORIA_PALETTE.highlight}",
  amber: "${PRIMORIA_PALETTE.amber}", amberFill: "${PRIMORIA_PALETTE.amberFill}",
  pine: "${PRIMORIA_PALETTE.pine}", pineFill: "${PRIMORIA_PALETTE.pineFill}",
  lavender: "${PRIMORIA_PALETTE.lavender}", lavenderFill: "${PRIMORIA_PALETTE.lavenderFill}",
  rose: "${PRIMORIA_PALETTE.rose}", roseFill: "${PRIMORIA_PALETTE.roseFill}",
  correct: "${PRIMORIA_PALETTE.correct}", correctFill: "${PRIMORIA_PALETTE.correctFill}",
  wrong: "${PRIMORIA_PALETTE.wrong}", wrongFill: "${PRIMORIA_PALETTE.wrongFill}"
});`;

const classGuide = Object.entries(LO_CLASS_DESCRIPTIONS)
  .map(([name, description]) => `${name} (${description})`)
  .join(", ");
const svgClassGuide = Object.keys(SVG_STYLE_CLASSES).map((name) => `c-${name}`).join(", ");
const cssVariableGuide = CSS_VARIABLES.map((name) => `var(${name})`).join(", ");
const paletteKeyGuide = Object.keys(PRIMORIA_PALETTE).map((key) => `PRIMORIA.${key}`).join(", ");

export const WIDGET_STYLE_PROMPT = [
  `Use the Primoria learning-object style (STYLE_VERSION ${LEARNING_OBJECT_STYLE_VERSION}). The iframe injects LEARNING_OBJECT_CSS, SVG_CLASSES_CSS, CSS variables, and window.PRIMORIA; never hardcode hex colors or invent a separate visual style.`,
  "A widget is one centered learning object: one concept, one primary action (observe / compare / choose / drag / adjust).",
  `For manipulable interactives use ${classGuide}.`,
  `For inline SVG use shape classes ${svgClassGuide} and text classes ${SVG_TEXT_CLASSES.join(", ")}.`,
  `When code needs a color in inline style, canvas, or THREE, read CSS variables ${cssVariableGuide} or palette keys ${paletteKeyGuide}.`,
  "Charts: 3-6 data items, direct labels instead of legends, gridlines var(--lo-grid); never use a saturated series color as a large fill, pair each *-fill variable with its stroke.",
  "Use tabular numerals for changing values. No gradients, no glassmorphism, no neon, no emoji decoration.",
].join(" ");

export const FLAT_VECTOR_IMAGE_STYLE =
  "Style: flat educational vector illustration, simple geometric shapes, low detail, bold clean outlines, slight paper-cut thickness with one hard offset shadow, warm off-white background, limited palette of deep pine green, amber, lavender and rose over warm neutrals, playful but precise. No gradients, no photorealism, no 3D render, no anime style.";
