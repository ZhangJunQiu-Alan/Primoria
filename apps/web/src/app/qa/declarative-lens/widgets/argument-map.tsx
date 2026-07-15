"use client";

import { useState, type CSSProperties } from "react";
import { analyzeArgumentMap, type ArgumentMapConfig } from "@/lib/qa/components/argument-map";
import { WIDGET_COLORS } from "./palette";

const kindLabels = { reason: "理由", evidence: "证据", objection: "反对意见", reply: "回应" } as const;
const nodeStyle: CSSProperties = {
  width: "100%", minHeight: 64, padding: "10px 12px", borderRadius: 8, textAlign: "left", cursor: "pointer",
  fontSize: 12.5, lineHeight: 1.45,
};

export function ArgumentMapWidget({ config, onChange: _onChange }: {
  config: ArgumentMapConfig;
  onChange: (next: ArgumentMapConfig) => void;
}) {
  const analysis = analyzeArgumentMap(config);
  const [selectedId, setSelectedId] = useState("central-claim");
  const selectedStatement = config.statements.find((statement) => statement.id === selectedId);
  const related = analysis.validRelations.filter((relation) => relation.fromId === selectedId || relation.toId === selectedId);
  void _onChange;

  return (
    <section style={{ overflow: "hidden", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 10, background: WIDGET_COLORS.surface }} aria-label="论证结构图">
      <header style={{ padding: "12px 16px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>论证结构图</div>
        <div style={{ marginTop: 2, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>理由与证据不是同一层；反对意见也不等于反例已经成立</div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 42px minmax(190px, 1.1fr) 42px minmax(160px, 1fr)", gap: 8, alignItems: "center", padding: 16 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: WIDGET_COLORS.series2, fontSize: 11.5, fontWeight: 600 }}>支持链</div>
          {analysis.groups.support.map((statement) => (
            <button key={statement.id} type="button" aria-pressed={selectedId === statement.id} onClick={() => setSelectedId(statement.id)} style={{
              ...nodeStyle, border: `1px solid ${WIDGET_COLORS.series2}`,
              background: selectedId === statement.id ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface,
              color: WIDGET_COLORS.ink,
            }}>
              <span style={{ display: "block", marginBottom: 3, color: WIDGET_COLORS.series2, fontSize: 10.5 }}>{kindLabels[statement.kind]}</span>
              {statement.text}
            </button>
          ))}
        </div>

        <div aria-hidden="true" style={{ color: WIDGET_COLORS.series2, textAlign: "center", fontSize: 24 }}>→</div>

        <button type="button" aria-pressed={selectedId === "central-claim"} onClick={() => setSelectedId("central-claim")} style={{
          ...nodeStyle, minHeight: 108, border: `2px solid ${WIDGET_COLORS.accent}`,
          background: selectedId === "central-claim" ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surfaceSoft,
          color: WIDGET_COLORS.ink, textAlign: "center", fontSize: 14,
        }}>
          <span style={{ display: "block", marginBottom: 7, color: WIDGET_COLORS.accent, fontSize: 11 }}>中心主张</span>
          {config.centralClaim}
        </button>

        <div aria-hidden="true" style={{ color: WIDGET_COLORS.series3, textAlign: "center", fontSize: 24 }}>←</div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: WIDGET_COLORS.series3, fontSize: 11.5, fontWeight: 600 }}>质疑与回应</div>
          {analysis.groups.challenge.map((statement) => (
            <button key={statement.id} type="button" aria-pressed={selectedId === statement.id} onClick={() => setSelectedId(statement.id)} style={{
              ...nodeStyle, border: `1px solid ${WIDGET_COLORS.series3}`,
              background: selectedId === statement.id ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface,
              color: WIDGET_COLORS.ink,
            }}>
              <span style={{ display: "block", marginBottom: 3, color: WIDGET_COLORS.series3, fontSize: 10.5 }}>{kindLabels[statement.kind]}</span>
              {statement.text}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, padding: "0 16px 16px" }}>
        <div style={{ padding: 12, borderRadius: 8, background: WIDGET_COLORS.surfaceSoft, color: WIDGET_COLORS.muted, fontSize: 11.5 }}>
          <b style={{ color: WIDGET_COLORS.ink }}>{selectedStatement ? kindLabels[selectedStatement.kind] : "中心主张"}</b>
          {related.length > 0 ? related.map((relation) => (
            <div key={`${relation.fromId}-${relation.toId}-${relation.relationType}`} style={{ marginTop: 4 }}>
              {relation.fromId} <b style={{ color: relation.relationType === "challenges" ? WIDGET_COLORS.series3 : WIDGET_COLORS.series2 }}>{relation.relationType}</b> {relation.toId}
            </div>
          )) : <div style={{ marginTop: 4 }}>没有有效关系连接到当前节点。</div>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", alignContent: "start" }}>
          <span style={{ padding: "4px 9px", borderRadius: 999, background: WIDGET_COLORS.accentSoft, color: WIDGET_COLORS.series2, fontSize: 11.5 }}>支持 {analysis.counts.supports}</span>
          <span style={{ padding: "4px 9px", borderRadius: 999, background: WIDGET_COLORS.chipBg, color: WIDGET_COLORS.series3, fontSize: 11.5 }}>质疑 {analysis.counts.challenges}</span>
          {analysis.invalidRelations.length > 0 ? <span style={{ padding: "4px 9px", borderRadius: 999, color: WIDGET_COLORS.warn, fontSize: 11.5 }}>失效关系 {analysis.invalidRelations.length}</span> : null}
        </div>
      </div>
    </section>
  );
}
