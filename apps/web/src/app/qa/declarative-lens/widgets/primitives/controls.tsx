import type { ReactNode } from "react";
import { WIDGET_COLORS } from "../palette";

export function Readout({ label, value, tone = "default" }: { label: string; value: ReactNode; tone?: "default" | "accent" | "warn" }) {
  const color = tone === "accent" ? WIDGET_COLORS.accent : tone === "warn" ? WIDGET_COLORS.warn : WIDGET_COLORS.muted;
  return (
    <span style={{ padding: "4px 9px", border: `1px solid ${tone === "default" ? WIDGET_COLORS.line : color}`, borderRadius: 999, background: WIDGET_COLORS.chipBg, color, fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
      {label} <b style={{ color: tone === "default" ? WIDGET_COLORS.ink : color }}>{value}</b>
    </span>
  );
}

export function SliderRow({ label, min, max, step, value, unit, onChange }: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "84px minmax(80px, 1fr) 64px", alignItems: "center", gap: 9, color: WIDGET_COLORS.muted, fontSize: 12 }}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ minWidth: 0, accentColor: WIDGET_COLORS.accent }} />
      <output style={{ color: WIDGET_COLORS.ink, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{value}{unit ?? ""}</output>
    </label>
  );
}

export function SegmentedControl<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 9, color: WIDGET_COLORS.muted, fontSize: 12 }}>
      <span>{label}</span>
      <span style={{ display: "inline-flex", overflow: "hidden", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 7 }}>
        {options.map(([option, text]) => (
          <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} style={{ border: 0, borderLeft: option === options[0]?.[0] ? 0 : `1px solid ${WIDGET_COLORS.line}`, padding: "5px 10px", background: value === option ? WIDGET_COLORS.accent : WIDGET_COLORS.surface, color: value === option ? WIDGET_COLORS.surface : WIDGET_COLORS.muted, cursor: "pointer", font: "inherit", fontWeight: value === option ? 650 : 400 }}>
            {text}
          </button>
        ))}
      </span>
    </div>
  );
}
