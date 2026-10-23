"use client";

import { useRef, useState } from "react";
import { getMolecularGeometry, projectMoleculeVector, type MolecularGeometryConfig } from "@/lib/interactive/components/molecular-geometry";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function MolecularGeometryWidget({ config, onChange }: { config: MolecularGeometryConfig; onChange: (next: MolecularGeometryConfig) => void }) {
  const t = useSceneLocale();
  const [camera, setCamera] = useState({ yaw: 0.55, pitch: -0.3 });
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const model = getMolecularGeometry(config.molecule);
  const set = <K extends keyof MolecularGeometryConfig>(key: K, value: MolecularGeometryConfig[K]) => onChange({ ...config, [key]: value });
  const bonds = model.bonds.map((vector, i) => ({ ...projectMoleculeVector(vector, camera.yaw, camera.pitch), id: i, symbol: model.outer, center: false }));
  const atoms = [...bonds, { x: 0, y: 0, depth: 0, perspective: 1, id: -1, symbol: model.center, center: true }].sort((a, b) => a.depth - b.depth);
  const localButton = { font: "inherit", fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 11px", background: C.surface, color: C.ink, cursor: "pointer" };
  return <SceneFrame id="chem.molecular-geometry" title={t("平面化学式，空间中的分子", "From a formula to a spatial molecule")} description={t("拖动画面或使用旋转按钮，辨别遮挡的化学键。孤电子对会影响分子构型。", "Drag or use the rotation controls to reveal hidden bonds. Lone pairs affect molecular shape.")}
    readouts={[{ label: t("分子构型", "Molecular shape"), value: t(model.geometry, model.geometryEn) }, { label: t("成键方向", "Bonding domains"), value: model.bonds.length }, { label: t("中心孤电子对", "Central lone pairs"), value: model.lonePairs.length }, ...(config.showAngles ? [{ label: t("典型键角", "Typical bond angles"), value: model.angles.map((a) => `${Number(a.toFixed(2))}°`).join(" / ") }] : [])]}
    controls={<>
      <SegmentedControl label={t("分子", "Molecule")} value={config.molecule} options={[["CO2", "CO₂"], ["BF3", "BF₃"], ["CH4", "CH₄"], ["NH3", "NH₃"], ["H2O", "H₂O"], ["PCl5", "PCl₅"], ["SF6", "SF₆"]]} onChange={(v) => set("molecule", v)} />
      <SegmentedControl label={t("观察", "View")} value={config.mode} options={[["ball-stick", t("球棍", "Ball and stick")], ["electron-domains", t("电子域", "Electron domains")]]} onChange={(v) => set("mode", v)} />
      <div role="group" aria-label={t("旋转分子视角", "Rotate molecular view")} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button type="button" style={localButton} onClick={() => setCamera((c) => ({ ...c, yaw: c.yaw - 0.3 }))}>{t("向左旋转", "Rotate left")}</button><button type="button" style={localButton} onClick={() => setCamera((c) => ({ ...c, yaw: c.yaw + 0.3 }))}>{t("向右旋转", "Rotate right")}</button><button type="button" style={localButton} onClick={() => setCamera((c) => ({ ...c, pitch: c.pitch + 0.3 }))}>{t("改变俯仰", "Tilt view")}</button><button type="button" style={localButton} onClick={() => setCamera({ yaw: 0.55, pitch: -0.3 })}>{t("重置视角", "Reset view")}</button></div>
      <label style={{ color: C.muted, fontSize: 12 }}><input type="checkbox" checked={config.showAngles} onChange={(e) => set("showAngles", e.target.checked)} /> {t("显示键角", "Show bond angles")}</label>
    </>}
    explanation={t("VSEPR 用电子域排斥解释构型：多重键在中心原子周围仍算一个成键方向。NH₃有一个中心孤电子对，H₂O有两个。电子域图只是方位示意，不是真实轨道或电子密度；模型键长与球半径不按比例。", "VSEPR describes shape through electron-domain repulsion. A multiple bond counts as one bonding direction. NH₃ has one central lone pair and H₂O has two. Domain clouds are schematic, not quantum orbitals or electron density; atom sizes and bond lengths are not to scale.")}>
    <svg viewBox="0 0 680 340" role="img" aria-label={`${config.molecule} ${t(model.geometry, model.geometryEn)}`} onPointerDown={(e) => { pointer.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }} onPointerMove={(e) => { if (!pointer.current || e.buttons === 0) return; const dx = e.clientX - pointer.current.x, dy = e.clientY - pointer.current.y; pointer.current = { x: e.clientX, y: e.clientY }; setCamera((c) => ({ yaw: c.yaw + dx * 0.01, pitch: c.pitch + dy * 0.01 })); }} style={{ width: "100%", display: "block", touchAction: "none", cursor: "grab" }}>
      <ellipse cx={340} cy={290} rx={150} ry={15} fill={C.line} opacity={0.3} />
      {config.mode === "electron-domains" ? model.lonePairs.map((vector, i) => { const q = projectMoleculeVector(vector, camera.yaw, camera.pitch); return <g key={i}><ellipse cx={340 + q.x * 105} cy={160 - q.y * 105} rx={27 * q.perspective} ry={20 * q.perspective} fill={C.series3} fillOpacity={0.13} stroke={C.series3} strokeDasharray="3 4" /><text x={340 + q.x * 105} y={165 - q.y * 105} textAnchor="middle" fill={C.series3} fontSize={15}>••</text></g>; }) : null}
      {bonds.flatMap((atom) => {
        const length = Math.max(0.01, Math.hypot(atom.x, atom.y));
        return Array.from({ length: model.bondOrder }, (_, bond) => {
          const offset = model.bondOrder === 1 ? 0 : bond === 0 ? -3 : 3;
          const dx = atom.y / length * offset, dy = atom.x / length * offset;
          return <line key={`${atom.id}-${bond}`} x1={340 + dx} y1={160 + dy} x2={340 + atom.x * 112 + dx} y2={160 - atom.y * 112 + dy} stroke={C.muted} strokeOpacity={0.35 + (atom.depth + 1) * 0.25} strokeWidth={(model.bondOrder === 1 ? 6 : 3) * Math.sqrt(atom.perspective)} strokeLinecap="round" />;
        });
      })}
      {atoms.map((atom) => <g key={atom.id} opacity={atom.center ? 1 : 0.65 + (atom.depth + 1) * 0.175}><circle cx={340 + atom.x * 112} cy={160 - atom.y * 112} r={(atom.center ? 25 : 21) * atom.perspective} fill={atom.center ? C.series2 : C.accent} stroke={C.surface} strokeWidth={2} /><circle cx={333 + atom.x * 112} cy={151 - atom.y * 112} r={6 * atom.perspective} fill="white" opacity={0.16} /><text x={340 + atom.x * 112} y={165 - atom.y * 112} fill={C.surface} textAnchor="middle" fontSize={15 * atom.perspective} fontWeight={650}>{atom.symbol}</text></g>)}
    </svg>
  </SceneFrame>;
}
