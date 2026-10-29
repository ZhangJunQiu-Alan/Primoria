"use client";

import { useInteractiveT } from "./i18n";
import { derivePolicyTradeoff, type PolicyTradeoffConfig } from "@/lib/interactive/components/policy-tradeoff";
import { WIDGET_COLORS } from "./palette";
import { Readout, SliderRow } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";
import { useSceneLocale } from "./primitives/scene-frame";

export function PolicyTradeoffWidget({ config, onChange }: { config: PolicyTradeoffConfig; onChange: (next: PolicyTradeoffConfig) => void }) {
  const t = useInteractiveT().widgets;
  const localize = useSceneLocale();
  const derived = derivePolicyTradeoff(config);
  return (
    <WidgetShell componentId="social.policy-tradeoff" title={t.policyTitle}>
      <style>{`@container primoria-scene (max-width: 540px) {.primoria-policy-columns {grid-template-columns:minmax(0,1fr)!important}}`}</style>
      <h3 style={{ margin: 0, padding: "16px 18px 8px", color: WIDGET_COLORS.ink, fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: 18 }}>{config.policyQuestion}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, padding: "8px 14px 14px" }}>{config.options.map((option, index) => <article key={option.id} style={{ borderTop: `4px solid ${[WIDGET_COLORS.series1, WIDGET_COLORS.series2, WIDGET_COLORS.series3][index % 3]}`, borderRadius: 8, padding: 12, background: WIDGET_COLORS.surfaceSoft }}><b style={{ color: WIDGET_COLORS.ink }}>{option.label}</b><p style={{ margin: "7px 0 0", color: WIDGET_COLORS.muted, fontSize: 12, lineHeight: 1.5 }}>{option.summary}</p></article>)}</div>
      <div className="primoria-policy-columns" style={{ display: "grid", gridTemplateColumns: "minmax(260px,1.2fr) minmax(210px,0.8fr)", gap: 18, padding: 14, borderTop: `1px solid ${WIDGET_COLORS.line}` }}>
        <div style={{ display: "grid", alignContent: "start", gap: 12, minWidth: 0 }}>{derived.weightedCriteria.map((criterion, index) => <div key={criterion.id}><SliderRow label={criterion.label} min={1} max={5} step={1} value={criterion.importance} onChange={(importance) => onChange({ ...config, criteria: config.criteria.map((item, itemIndex) => itemIndex === index ? { ...item, importance } : item) })} /><div style={{ marginTop: 6, color: WIDGET_COLORS.muted, fontSize: 11 }}>{localize("相对权重", "Relative weight")} · {(criterion.share * 100).toFixed(1)}%</div><div role="meter" aria-label={`${criterion.label} · ${localize("相对权重", "Relative weight")}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number((criterion.share * 100).toFixed(1))} style={{ marginTop: 5, height: 7, borderRadius: 4, background: WIDGET_COLORS.line }}><div style={{ height: "100%", width: `${criterion.share * 100}%`, borderRadius: 4, background: WIDGET_COLORS.accent }} /></div></div>)}</div>
        <div style={{ minWidth: 0, overflowWrap: "anywhere" }}><b style={{ color: WIDGET_COLORS.ink, fontSize: 12 }}>{t.stakeholders}</b>{config.stakeholders.map((stakeholder) => <div key={stakeholder.id} style={{ marginTop: 7, padding: 8, border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 7, fontSize: 11.5 }}><b style={{ color: WIDGET_COLORS.series3 }}>{stakeholder.label}</b><div style={{ color: WIDGET_COLORS.muted, marginTop: 3 }}>{stakeholder.priority}</div></div>)}</div>
      </div>
      <div style={{ display: "flex", gap: 7, padding: "0 14px 14px" }}><Readout label={t.principle} value={t.policyPrinciple} tone="accent" /></div>
    </WidgetShell>
  );
}
