// Shared palette for QA declarative widgets — keeps the batch visually
// consistent. Production integration will replace these with pine-stage theme
// tokens; do not add per-widget ad-hoc colors.

export const WIDGET_COLORS = {
  ink: "#2f2a23",
  muted: "#6b6357",
  line: "#d8d2c4",
  surface: "#fff",
  surfaceSoft: "#f7f3e9",
  chipBg: "#f3efe4",
  accent: "#2e6e4e",
  accentSoft: "#e2eee6",
  series1: "#c07a1f",
  series2: "#3b6ea8",
  series3: "#9a4f86",
  warn: "#a05a1c",
} as const;
