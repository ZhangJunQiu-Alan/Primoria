"use client";

import { useState } from "react";
import { deriveCharacterRelationships, type CharacterRelationshipsConfig } from "@/lib/interactive/components/character-relationships";
import { WIDGET_COLORS } from "./palette";
import { Readout } from "./primitives/controls";
import { WidgetShell } from "./primitives/widget-shell";

const W = 680;
const H = 310;
export function CharacterRelationshipsWidget({ config, onChange }: { config: CharacterRelationshipsConfig; onChange: (next: CharacterRelationshipsConfig) => void }) {
  const derived = deriveCharacterRelationships(config);
  const [selectedId, setSelectedId] = useState(config.characters[0]?.id ?? "");
  const positions = new Map(config.characters.map((character, index) => [character.id, { x: W / 2 + Math.cos(-Math.PI / 2 + index / config.characters.length * Math.PI * 2) * 205, y: H / 2 + Math.sin(-Math.PI / 2 + index / config.characters.length * Math.PI * 2) * 105 }]));
  const selected = config.characters.find((character) => character.id === selectedId) ?? config.characters[0];
  return (
    <WidgetShell componentId="literature.character-relationships" title={`${config.workTitle} · 人物关系`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 14px 0" }}>{derived.phases.map((phase) => <button key={phase} type="button" onClick={() => onChange({ ...config, selectedPhase: phase })} style={{ border: `1px solid ${phase === config.selectedPhase ? WIDGET_COLORS.accent : WIDGET_COLORS.line}`, borderRadius: 999, padding: "4px 10px", background: phase === config.selectedPhase ? WIDGET_COLORS.accentSoft : WIDGET_COLORS.surface, color: WIDGET_COLORS.ink, cursor: "pointer" }}>{phase}</button>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${config.selectedPhase}阶段人物关系图`} style={{ display: "block", width: "100%" }}>
        {derived.visibleRelationships.map((relationship) => { const from = positions.get(relationship.fromCharacterId); const to = positions.get(relationship.toCharacterId); if (!from || !to) return null; return <g key={`${relationship.fromCharacterId}-${relationship.toCharacterId}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={WIDGET_COLORS.series3} strokeWidth="3" /><text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle" fontSize="10" fill={WIDGET_COLORS.muted}>{relationship.relationship}</text></g>; })}
        {config.characters.map((character) => { const point = positions.get(character.id)!; const active = selected.id === character.id; return <g key={character.id} onClick={() => setSelectedId(character.id)} style={{ cursor: "pointer" }}><circle cx={point.x} cy={point.y} r={active ? 34 : 29} fill={active ? WIDGET_COLORS.accent : WIDGET_COLORS.accentSoft} stroke={WIDGET_COLORS.accent} strokeWidth="2" /><text x={point.x} y={point.y + 4} textAnchor="middle" fontSize="11" fontWeight="650" fill={active ? WIDGET_COLORS.surface : WIDGET_COLORS.ink}>{character.name}</text></g>; })}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: 14, background: WIDGET_COLORS.surfaceSoft }}><Readout label="角色" value={selected.role} /><Readout label="目标" value={selected.goal} />{derived.invalidRelationshipCount ? <Readout label="忽略失效关系" value={derived.invalidRelationshipCount} tone="warn" /> : null}</div>
    </WidgetShell>
  );
}
