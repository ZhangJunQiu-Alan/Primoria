"use client";

import { useState } from "react";
import { traceSort, type SortingStepsConfig } from "@/lib/qa/components/sorting-steps";
import { WIDGET_COLORS } from "./palette";
import { Readout, SegmentedControl } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

export function SortingStepsWidget({ config, onChange }: { config: SortingStepsConfig; onChange: (next: SortingStepsConfig) => void }) {
  const trace = traceSort(config);
  const [requestedStep, setRequestedStep] = useState(0);
  const stepIndex = Math.min(requestedStep, trace.steps.length - 1);
  const current = trace.steps[stepIndex];
  const maxValue = Math.max(...config.values);
  return (
    <WidgetShell componentId="cs.sorting-steps" title="排序算法 · 分步执行">
      <div style={{ display: "flex", alignItems: "end", gap: 7, minHeight: 230, padding: "24px 16px 12px", borderBottom: `1px solid ${WIDGET_COLORS.line}` }}>
        {current.values.map((value, index) => {
          const swapped = current.swapped.includes(index);
          const compared = current.compared.includes(index);
          return <div key={`${index}-${value}`} style={{ flex: 1, minWidth: 22, height: `${42 + value / maxValue * 150}px`, display: "grid", placeItems: "start center", paddingTop: 7, borderRadius: "6px 6px 2px 2px", background: swapped ? WIDGET_COLORS.series1 : compared ? WIDGET_COLORS.series2 : WIDGET_COLORS.accentSoft, color: swapped || compared ? WIDGET_COLORS.surface : WIDGET_COLORS.ink, fontWeight: 700, transition: "height 160ms ease, background 160ms ease" }}>{value}</div>;
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 14px" }}>
        <button type="button" disabled={stepIndex === 0} onClick={() => setRequestedStep((value) => Math.max(0, value - 1))}>上一步</button>
        <button type="button" disabled={stepIndex === trace.steps.length - 1} onClick={() => setRequestedStep((value) => Math.min(trace.steps.length - 1, value + 1))}>下一步</button>
        <Readout label="步骤" value={`${stepIndex}/${trace.steps.length - 1}`} />
        <Readout label="比较" value={trace.comparisons} />
        <Readout label="移动/交换" value={trace.swaps} />
        <span style={{ color: WIDGET_COLORS.muted, fontSize: 11.5 }}>{current.note}</span>
      </div>
      <div style={{ padding: "0 14px 14px" }}>
        <SegmentedControl label="算法" value={config.algorithm} options={[["bubble", "冒泡"], ["selection", "选择"], ["insertion", "插入"]]} onChange={(algorithm) => { setRequestedStep(0); onChange({ ...config, algorithm }); }} />
      </div>
    </WidgetShell>
  );
}
