"use client";

import { useState } from "react";
import { deriveProcessSequence, type ProcessSequenceConfig } from "@/lib/qa/components/process-sequence";
import { WIDGET_COLORS } from "./palette";
import { Readout } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

export function ProcessSequenceWidget({ config, onChange: _onChange }: { config: ProcessSequenceConfig; onChange: (next: ProcessSequenceConfig) => void }) {
  const derived = deriveProcessSequence(config);
  const [requestedIndex, setRequestedIndex] = useState(0);
  const index = Math.min(requestedIndex, derived.steps.length - 1);
  const current = derived.steps[index];
  void _onChange;
  return (
    <WidgetShell componentId="general.process-sequence" title={config.processName}>
      <div style={{ display: "flex", overflowX: "auto", alignItems: "center", gap: 6, padding: "18px 14px" }}>
        {derived.steps.map((step, stepIndex) => <div key={step.id} style={{ display: "contents" }}><button type="button" onClick={() => setRequestedIndex(stepIndex)} style={{ minWidth: 118, border: `1px solid ${stepIndex === index ? WIDGET_COLORS.accent : WIDGET_COLORS.line}`, borderRadius: 9, padding: "10px", background: stepIndex === index ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface, color: WIDGET_COLORS.ink, cursor: "pointer", textAlign: "left" }}><small style={{ color: WIDGET_COLORS.muted }}>步骤 {step.order}</small><div style={{ marginTop: 4, fontWeight: 650 }}>{step.label}</div></button>{stepIndex < derived.steps.length - 1 ? <span aria-hidden style={{ color: WIDGET_COLORS.series1 }}>→</span> : null}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "0 14px 12px" }}>
        {[["输入", current.input], ["变化", current.change], ["输出", current.output]].map(([label, value], itemIndex) => <div key={label} style={{ borderTop: `3px solid ${[WIDGET_COLORS.series1, WIDGET_COLORS.series2, WIDGET_COLORS.accent][itemIndex]}`, borderRadius: 7, padding: 10, background: WIDGET_COLORS.surfaceSoft }}><b style={{ color: WIDGET_COLORS.muted, fontSize: 11 }}>{label}</b><p style={{ margin: "6px 0 0", color: WIDGET_COLORS.ink, fontSize: 12.5, lineHeight: 1.45 }}>{value}</p></div>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "0 14px 14px" }}><Readout label="步骤" value={`${index + 1}/${derived.steps.length}`} />{derived.validFeedbackLinks.map((link) => <Readout key={`${link.fromStepId}-${link.toStepId}`} label="反馈" value={`${link.fromStepId} ↺ ${link.toStepId}`} tone="accent" />)}{derived.invalidFeedbackCount ? <Readout label="忽略失效反馈" value={derived.invalidFeedbackCount} tone="warn" /> : null}</div>
    </WidgetShell>
  );
}
