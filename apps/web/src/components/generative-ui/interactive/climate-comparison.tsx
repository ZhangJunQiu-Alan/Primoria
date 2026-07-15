"use client";

import { useInteractiveT } from "./i18n";
import { summarizeClimate, type ClimateComparisonConfig } from "@/lib/interactive/components/climate-comparison";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

const W = 680;
const H = 300;
const COLORS = [WIDGET_COLORS.series1, WIDGET_COLORS.series2, WIDGET_COLORS.series3];
function linePath(values: number[], min: number, max: number, top: number, height: number) { return values.map((value, index) => `${index ? "L" : "M"}${40 + index / 11 * (W - 70)},${top + height - (value - min) / Math.max(1, max - min) * height}`).join(" "); }
export function ClimateComparisonWidget({ config, onChange }: { config: ClimateComparisonConfig; onChange: (next: ClimateComparisonConfig) => void }) {
  const t = useInteractiveT().widgets;
  const summaries = summarizeClimate(config);
  const temperatures = config.places.flatMap((place) => place.monthlyTemperatureC);
  const minTemp = Math.min(...temperatures) - 2;
  const maxTemp = Math.max(...temperatures) + 2;
  const maxRain = Math.max(...config.places.flatMap((place) => place.monthlyPrecipitationMm));
  return (
    <WidgetShell componentId="geography.climate-comparison" title={t.climateTitle}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.climateAria} style={{ display: "block", width: "100%" }}>
        <line x1="40" y1="145" x2={W - 30} y2="145" stroke={WIDGET_COLORS.line} /><text x="12" y="75" fontSize="10" fill={WIDGET_COLORS.muted}>{t.temperature}</text><text x="12" y="225" fontSize="10" fill={WIDGET_COLORS.muted}>{t.precipitation}</text>
        {config.places.map((place, index) => <g key={place.name}><path d={linePath(place.monthlyTemperatureC, minTemp, maxTemp, 20, 100)} fill="none" stroke={COLORS[index]} strokeWidth="2.5" /><path d={linePath(place.monthlyPrecipitationMm, 0, maxRain, 170, 90)} fill="none" stroke={COLORS[index]} strokeWidth="2.5" strokeDasharray="5 3" /></g>)}
        {Array.from({ length: 12 }, (_, index) => <text key={index} x={40 + index / 11 * (W - 70)} y="286" textAnchor="middle" fontSize="9" fill={WIDGET_COLORS.muted}>{index + 1}</text>)}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 14px" }}>{summaries.map((place, index) => {
        const focus = config.comparisonFocus;
        return <span key={place.name} style={{ borderLeft: `4px solid ${COLORS[index]}`, paddingLeft: 8 }}><b style={{ color: WIDGET_COLORS.ink, fontSize: 12 }}>{place.name}</b><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          <Readout label={t.meanTemperature} value={`${place.meanTemperatureC.toFixed(1)}°C`} />
          <Readout label={t.temperatureRange} value={`${place.temperatureRangeC.toFixed(1)}°C`} tone={focus === "temperature-range" || focus === "continentality" ? "accent" : "default"} />
          <Readout label={t.annualPrecipitation} value={`${place.annualPrecipitationMm}mm`} tone={focus === "precipitation-seasonality" ? "accent" : "default"} />
          {focus === "hemisphere" ? <Readout label={t.hemisphere} value={place.latitudeDeg >= 0 ? t.northernHemisphere : t.southernHemisphere} tone="accent" /> : null}
        </div></span>;
      })}</div>
      <div style={{ padding: "4px 14px 14px" }}><SegmentedControl label={t.comparisonFocus} value={config.comparisonFocus} options={[["temperature-range", t.temperatureRange], ["precipitation-seasonality", t.precipitationSeasonality], ["hemisphere", t.hemisphere], ["continentality", t.continentality]]} onChange={(comparisonFocus) => onChange({ ...config, comparisonFocus })} /></div>
    </WidgetShell>
  );
}
