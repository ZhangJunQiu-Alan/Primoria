"use client";

import { computeMoonPhase, SYNODIC_MONTH, type MoonPhasesConfig } from "@/lib/interactive/components/moon-phases";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function MoonPhasesWidget({ config, onChange }: { config: MoonPhasesConfig; onChange: (next: MoonPhasesConfig) => void }) {
  const t = useSceneLocale();
  const r = computeMoonPhase(config);
  const labels = t("新月,娥眉月,上弦月,盈凸月,满月,亏凸月,下弦月,残月", "New moon,Waxing crescent,First quarter,Waxing gibbous,Full moon,Waning gibbous,Last quarter,Waning crescent").split(",");
  const set = <K extends keyof MoonPhasesConfig>(key: K, value: MoonPhasesConfig[K]) => onChange({ ...config, [key]: value });
  const moonX = 280 - 114 * Math.cos(r.angle), moonY = 160 - 114 * Math.sin(r.angle);
  const appearanceX = config.view === "appearance" ? 340 : 544;
  const radius = config.view === "appearance" ? 106 : 70;
  const path = r.outline.map(({ x, y }, i) => `${i ? "L" : "M"}${appearanceX + x * radius},${160 + y * radius}`).join("") + "Z";
  return <SceneFrame id="astronomy.moon-phases" title={t("月亮为什么有圆缺？", "Why does the Moon change shape?")} description={t("拖动月龄，同时观察空间位置与地球上看到的亮面。示意图不按天体大小和距离比例绘制。", "Move through the lunar month to connect orbital position to the illuminated face. Sizes and distances are schematic.")}
    readouts={[{ label: t("月相", "Phase"), value: labels[r.phaseIndex] }, { label: t("可见亮面", "Illuminated fraction"), value: `${(r.illuminatedFraction * 100).toFixed(1)}%` }, { label: t("新月后", "Since new moon"), value: config.day.toFixed(2), unit: t("天", "days") }]}
    controls={<>
      <SliderRow label={t("月龄", "Lunar age")} min={0} max={SYNODIC_MONTH} step={0.01} value={config.day} unit={t("天", "d")} onChange={(v) => set("day", v)} />
      <div role="group" aria-label={t("八大月相", "Eight lunar phases")} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{labels.map((label, index) => <button key={label} type="button" onClick={() => set("day", index * SYNODIC_MONTH / 8)} style={{ font: "inherit", fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 8px", color: C.ink, background: r.phaseIndex === index ? C.accentSoft : C.surface }}>{label}</button>)}</div>
      <SegmentedControl label={t("视角", "View")} value={config.view} options={[["orbit", t("日地月位置", "Orbit")], ["appearance", t("地面观测", "Appearance")]]} onChange={(v) => set("view", v)} />
      <SegmentedControl label={t("半球", "Hemisphere")} value={config.hemisphere} options={[["north", t("北半球", "North")], ["south", t("南半球", "South")]]} onChange={(v) => set("hemisphere", v)} />
      <label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showLabels} onChange={(e) => set("showLabels", e.target.checked)} /> {t("显示标注", "Show labels")}</label>
    </>}
    explanation={t("太阳总照亮月球的大约一半；月相由我们能看见其中多少决定，通常不是地球影子造成的。南北半球的朝向不同，亮面比例相同。一个朔望月约 29.53 天。", "Sunlight illuminates roughly half the Moon. Phases describe how much of that half we can see; they are not normally caused by Earth's shadow. Hemisphere changes orientation, not illumination. A synodic month is about 29.53 days.")}>
    <svg viewBox="0 0 680 330" role="img" aria-label={`${labels[r.phaseIndex]} ${(r.illuminatedFraction * 100).toFixed(1)}%`} style={{ width: "100%", display: "block" }}>
      {config.view === "orbit" ? <>
        <circle cx={280} cy={160} r={114} fill="none" stroke={C.line} strokeDasharray="4 6" />
        {[74, 115, 205, 246].map((y) => <g key={y}><line x1={38} x2={414} y1={y} y2={y} stroke={C.series1} opacity={0.15} /><path d={`M90,${y - 4}l7,4l-7,4`} stroke={C.series1} fill="none" /></g>)}
        <circle cx={45} cy={160} r={30} fill={C.series1} fillOpacity={0.15} stroke={C.series1} /><text x={45} y={165} textAnchor="middle" fontSize={12} fill={C.series1}>{t("太阳", "Sun")}</text>
        <circle cx={280} cy={160} r={25} fill={C.series2} /><path d="M275,140q-18,10,-5,20t5,20q-18,1,-20,-20t20,-20" fill={C.accent} />
        <circle cx={moonX} cy={moonY} r={12} fill="#202d3a" stroke={C.muted} /><path d={`M${moonX},${moonY - 12}a12,12 0 0 0 0,24Z`} fill="#f0e6cd" /><path d={`M280,160L${moonX},${moonY}`} stroke={C.muted} strokeDasharray="3 5" />
        {config.showLabels ? <><text x={280} y={208} textAnchor="middle" fontSize={12} fill={C.series2}>{t("地球", "Earth")}</text><text x={moonX} y={moonY - 22} textAnchor="middle" fontSize={12} fill={C.ink}>{t("月球", "Moon")}</text></> : null}
      </> : null}
      <circle cx={appearanceX} cy={160} r={radius} fill="#202d3a" stroke={C.line} />
      <path d={path} fill="#f0e6cd" />
      {config.showLabels ? <text x={appearanceX} y={config.view === "appearance" ? 304 : 266} textAnchor="middle" fill={C.muted} fontSize={13}>{t("地面看到的月亮", "Appearance from Earth")}</text> : null}
    </svg>
  </SceneFrame>;
}
