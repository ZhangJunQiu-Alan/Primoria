"use client";

import { useState } from "react";
import { useInteractiveT } from "./i18n";
import { traceSort, type SortingStepsConfig } from "@/lib/interactive/components/sorting-steps";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

export function SortingStepsWidget({ config, onChange }: { config: SortingStepsConfig; onChange: (next: SortingStepsConfig) => void }) {
  const t = useInteractiveT().widgets;
  const trace = traceSort(config);
  const [requestedStep, setRequestedStep] = useState(0);
  const stepIndex = Math.min(requestedStep, trace.steps.length - 1);
  const current = trace.steps[stepIndex];
  const maxValue = Math.max(...config.values);
  return (
    <WidgetShell componentId="cs.sorting-steps" title={t.sortingTitle}>
      <div style={{ display: "flex", alignItems: "end", gap: 7, minHeight: 230, padding: "24px 16px 12px", borderBottom: `1px solid ${WIDGET_COLORS.line}` }}>
        {current.values.map((value, index) => {
          const swapped = current.swapped.includes(index);
          const compared = current.compared.includes(index);
          return <div key={`${index}-${value}`} style={{ flex: 1, minWidth: 22, height: `${42 + value / maxValue * 150}px`, display: "grid", placeItems: "start center", paddingTop: 7, borderRadius: "6px 6px 2px 2px", background: swapped ? WIDGET_COLORS.series1 : compared ? WIDGET_COLORS.series2 : WIDGET_COLORS.accentSoft, color: swapped || compared ? WIDGET_COLORS.surface : WIDGET_COLORS.ink, fontWeight: 700, transition: "height 160ms ease, background 160ms ease" }}>{value}</div>;
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 14px" }}>
        <button type="button" disabled={stepIndex === 0} onClick={() => setRequestedStep((value) => Math.max(0, value - 1))}>{t.previousStep}</button>
        <button type="button" disabled={stepIndex === trace.steps.length - 1} onClick={() => setRequestedStep((value) => Math.min(trace.steps.length - 1, value + 1))}>{t.nextStep}</button>
        <Readout label={t.step} value={`${stepIndex}/${trace.steps.length - 1}`} />
        <Readout label={t.comparison} value={trace.comparisons} />
        <Readout label={t.movesSwaps} value={trace.swaps} />
        <span style={{ color: WIDGET_COLORS.muted, fontSize: 11.5 }}>{current.note}</span>
      </div>
      <div style={{ padding: "0 14px 14px" }}>
        <SegmentedControl label={t.algorithm} value={config.algorithm} options={[["bubble", t.bubble], ["selection", t.selection], ["insertion", t.insertion]]} onChange={(algorithm) => { setRequestedStep(0); onChange({ ...config, algorithm }); }} />
      </div>
    </WidgetShell>
  );
}
