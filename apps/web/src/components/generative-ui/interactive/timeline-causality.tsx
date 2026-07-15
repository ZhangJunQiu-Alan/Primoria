"use client";

import { useState, type CSSProperties } from "react";
import { deriveTimelineCausality, type TimelineCausalityConfig } from "@/lib/interactive/components/timeline-causality";
import { WIDGET_COLORS } from "./palette";

const shellStyle: CSSProperties = {
  overflow: "hidden",
  border: `1px solid ${WIDGET_COLORS.line}`,
  borderRadius: 10,
  background: WIDGET_COLORS.surface,
};

export function TimelineCausalityWidget({ config, onChange: _onChange }: {
  config: TimelineCausalityConfig;
  onChange: (next: TimelineCausalityConfig) => void;
}) {
  const derived = deriveTimelineCausality(config);
  const [selectedId, setSelectedId] = useState(config.events[0]?.id ?? "");
  const selected = derived.events.find((event) => event.id === selectedId) ?? derived.events[0];
  const relatedLinks = derived.validLinks.filter(
    (link) => link.fromEventId === selected.id || link.toEventId === selected.id,
  );
  void _onChange;

  return (
    <section style={shellStyle} aria-label={`因果时间线: ${config.timelineTitle}`}>
      <header style={{ padding: "12px 16px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{config.timelineTitle}</div>
        <div style={{ marginTop: 2, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>选择事件，区分时间先后与直接因果</div>
      </header>

      <div style={{ overflowX: "auto", padding: "24px 18px 18px" }}>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${derived.events.length}, minmax(128px, 1fr))`, gap: 12, minWidth: derived.events.length * 140 }}>
          <div aria-hidden="true" style={{ position: "absolute", top: 25, left: 28, right: 28, height: 2, background: WIDGET_COLORS.line }} />
          {derived.events.map((event) => {
            const active = event.id === selected.id;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedId(event.id)}
                aria-pressed={active}
                style={{
                  position: "relative", minHeight: 116, padding: "0 10px 10px", border: "none", background: "transparent",
                  color: WIDGET_COLORS.ink, textAlign: "left", cursor: "pointer",
                }}
              >
                <span style={{
                  display: "grid", placeItems: "center", width: 28, height: 28, margin: "0 auto 10px",
                  borderRadius: "50%", border: `2px solid ${active ? WIDGET_COLORS.accent : WIDGET_COLORS.line}`,
                  background: active ? WIDGET_COLORS.accent : WIDGET_COLORS.surface, color: active ? WIDGET_COLORS.surface : WIDGET_COLORS.muted,
                  fontSize: 11, fontWeight: 600,
                }}>{event.order}</span>
                <span style={{ display: "block", color: WIDGET_COLORS.series1, fontSize: 11.5 }}>{event.dateLabel}</span>
                <span style={{ display: "block", marginTop: 3, fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{event.label}</span>
                <span style={{ display: "block", marginTop: 5, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>
                  {event.incoming} 个原因 · {event.outgoing} 个后果
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(220px, .8fr)", gap: 12, padding: "0 16px 16px" }}>
        <div style={{ padding: 14, borderRadius: 8, background: WIDGET_COLORS.accentSoft }}>
          <div style={{ color: WIDGET_COLORS.accent, fontSize: 11.5, fontWeight: 600 }}>{selected.dateLabel} · {selected.label}</div>
          <p style={{ margin: "7px 0 0", color: WIDGET_COLORS.ink, fontSize: 12.5, lineHeight: 1.55 }}>{selected.summary}</p>
        </div>
        <div style={{ display: "grid", gap: 7, alignContent: "start" }}>
          {relatedLinks.length > 0 ? relatedLinks.map((link) => (
            <div key={`${link.fromEventId}-${link.toEventId}`} style={{ padding: "8px 10px", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 8, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>
              <b style={{ color: WIDGET_COLORS.series2 }}>{link.fromEventId} → {link.toEventId}</b>
              <div style={{ marginTop: 3 }}>{link.explanation}</div>
            </div>
          )) : <div style={{ color: WIDGET_COLORS.muted, fontSize: 11.5 }}>没有声明与该事件直接相连的因果关系。</div>}
          {derived.invalidLinks.length > 0 ? <div style={{ color: WIDGET_COLORS.warn, fontSize: 11 }}>已忽略 {derived.invalidLinks.length} 条失效引用。</div> : null}
        </div>
      </div>
    </section>
  );
}
