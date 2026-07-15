"use client";

import { useState, type CSSProperties } from "react";
import { msg } from "@/lib/i18n/client";
import { useInteractiveT } from "./i18n";
import { deriveTimelineCausality, type TimelineCausalityConfig } from "@/lib/interactive/components/timeline-causality";
import { WIDGET_COLORS } from "./palette";

const shellStyle: CSSProperties = {
  overflow: "hidden",
  border: `1px solid ${WIDGET_COLORS.line}`,
  borderRadius: 10,
  background: WIDGET_COLORS.surface,
};

export function TimelineCausalityWidget({ config, onChange }: {
  config: TimelineCausalityConfig;
  onChange: (next: TimelineCausalityConfig) => void;
}) {
  const derived = deriveTimelineCausality(config);
  const t = useInteractiveT();
  const [selectedId, setSelectedId] = useState(config.events[0]?.id ?? "");
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const selected = derived.events.find((event) => event.id === selectedId) ?? derived.events[0];
  const relatedLinks = derived.validLinks.filter(
    (link) => link.fromEventId === selected.id || link.toEventId === selected.id,
  );
  void onChange;

  return (
    <section style={shellStyle} aria-label={msg(t.timeline.aria, { title: config.timelineTitle })}>
      <header style={{ padding: "12px 16px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{config.timelineTitle}</div>
        <div style={{ marginTop: 2, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>{t.timeline.subtitle}</div>
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
                  {msg(t.timeline.causes, { count: event.incoming })} · {msg(t.timeline.effects, { count: event.outgoing })}
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
          )) : <div style={{ color: WIDGET_COLORS.muted, fontSize: 11.5 }}>{t.timeline.noLinks}</div>}
          {derived.invalidLinks.length > 0 ? <div style={{ color: WIDGET_COLORS.warn, fontSize: 11 }}>{msg(t.timeline.ignoredLinks, { count: derived.invalidLinks.length })}</div> : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: 6, padding: "0 16px 14px" }}>
        <label htmlFor={`timeline-note-${selected.id}`} style={{ color: WIDGET_COLORS.muted, fontSize: 11.5, fontWeight: 650 }}>{t.common.studentAnnotation}</label>
        <textarea
          id={`timeline-note-${selected.id}`}
          value={annotations[selected.id] ?? ""}
          placeholder={t.common.annotationPlaceholder}
          rows={2}
          onChange={(event) => setAnnotations((current) => ({ ...current, [selected.id]: event.target.value }))}
          style={{ width: "100%", resize: "vertical", padding: "9px 10px", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 8, background: WIDGET_COLORS.surface, color: WIDGET_COLORS.ink, fontSize: 12 }}
        />
      </div>
      <p style={{ margin: 0, padding: "10px 16px", borderTop: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft, color: WIDGET_COLORS.muted, fontSize: 10.5, lineHeight: 1.45 }}>{t.common.generatedContentNotice}</p>
    </section>
  );
}
