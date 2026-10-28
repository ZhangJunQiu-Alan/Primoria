import type { CSSProperties } from "react";

/**
 * Hex values for the landing illustrations. SVG presentation attributes cannot
 * read CSS custom properties reliably, so the drawings take the same palette as
 * the globals.css tokens in literal form.
 */
export const PALETTE = {
  ink: "#1a1814",
  ink2: "#3b362f",
  muted: "#6b655c",
  quiet: "#8f887d",
  lineSoft: "#ece6da",
  lineStrong: "#d5cdbf",
  panel: "#fffefb",
  paper: "#f6f3ec",
  paperDeep: "#efeae0",
  pine: "#1e4d40",
  pineTint: "#e3ece6",
  pineSoft: "#b9cbbf",
  amber: "#c8881a",
  amberInk: "#8a5c0e",
  amberTint: "#fbeed3",
  coral: "#d9603f",
  roseTint: "#f9e3ea",
  roseInk: "#a64d64",
  lavender: "#6a55c4",
  lavenderTint: "#e6e0f6",
  lavenderLine: "#c9c0e8",
  correct: "#2e7d4f",
  correctTint: "#e4f1e8",
  wrong: "#c2452f",
  wrongTint: "#f7e6e0",
} as const;

/** Per-element accent (and optional tint) consumed by `var(--landing-accent)` / `var(--landing-tint)` in globals.css. */
export function accentStyle(accent: string, tint?: string): CSSProperties {
  const vars: Record<string, string> = { "--landing-accent": accent };
  if (tint) vars["--landing-tint"] = tint;
  return vars as CSSProperties;
}

export function isCjk(text: string) {
  return /[㐀-鿿]/.test(text);
}
