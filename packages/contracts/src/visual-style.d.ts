export declare const LEARNING_OBJECT_STYLE_VERSION: "v3";
export declare const LO_CANVAS: "#ffffff";
export declare const LO_PAGE: "#fbf7ee";
export declare const LO_BORDER: "#e7dfd0";
export declare const LO_INK: "#29241c";
export declare const LO_MUTED: "#6b6357";
export declare const LO_GRID: "#efece4";
export declare const LO_STAGE: "#1e4d40";
export declare const LO_STAGE_DEEP: "#10312a";
export declare const LO_STAGE_OBJECT: "#fffdf6";
export declare const LO_STAGE_BORDER: "#7eae9d";
export declare const LO_HIGHLIGHT: "#7ed6ae";
export declare const LO_SELECTED_TINT: "#e2f6ee";

export type SeriesToken = { readonly fill: string; readonly stroke: string };
export declare const SERIES: Readonly<{
  amber: SeriesToken;
  pine: SeriesToken;
  sage: SeriesToken;
  lavender: SeriesToken;
  rose: SeriesToken;
}>;
export declare const SERIES_NAMES: readonly ["amber", "pine", "lavender", "rose"];
export declare const SERIES_FILLS: readonly string[];
export declare const SERIES_STROKES: readonly string[];

export declare const LO_CORRECT: SeriesToken;
export declare const LO_WRONG: SeriesToken;
export declare const LO_DISABLED: SeriesToken;

export declare const LO_CLASS_DESCRIPTIONS: Readonly<Record<string, string>>;
export declare const CSS_VARIABLES: readonly string[];
export declare const PRIMORIA_PALETTE: Readonly<Record<string, string>>;
export declare const SVG_TEXT_CLASSES: readonly string[];
export declare const SVG_STYLE_CLASSES: Readonly<Record<string, { readonly fill: string; readonly stroke: string; readonly text: string }>>;

export declare const LEARNING_OBJECT_CSS: string;
export declare const SVG_CLASSES_CSS: string;
export declare const PRIMORIA_PALETTE_JS: string;
export declare const WIDGET_STYLE_PROMPT: string;
export declare const FLAT_VECTOR_IMAGE_STYLE: string;
