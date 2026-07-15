// Production semantic tokens with fallbacks for isolated QA rendering.
// Widgets inherit the same pine-stage palette as the surrounding Tutor UI.

export const WIDGET_COLORS = {
  ink: "var(--color-text-primary, #17130f)",
  muted: "var(--color-text-secondary, #6f675f)",
  line: "var(--color-border-tertiary, rgba(23, 19, 15, 0.12))",
  surface: "var(--color-background-primary, #fffdf8)",
  surfaceSoft: "var(--color-background-secondary, #f3eee7)",
  chipBg: "var(--color-background-tertiary, #efe8dc)",
  accent: "var(--color-text-success, #2f6b43)",
  accentSoft: "var(--color-background-success, #eaf7ee)",
  series1: "var(--color-text-warning, #7c560e)",
  series2: "var(--color-text-info, #245f9f)",
  series3: "var(--color-data-series-3, #7a4f92)",
  warn: "var(--color-text-danger, #9d3d2d)",
} as const;
