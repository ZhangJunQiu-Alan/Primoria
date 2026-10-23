"use client";

import { closedCircuitLoadPower, computeClosedCircuit, type ClosedCircuitConfig } from "@/lib/interactive/components/closed-circuit";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function ClosedCircuitWidget({ config, onChange }: { config: ClosedCircuitConfig; onChange: (next: ClosedCircuitConfig) => void }) {
  const t = useSceneLocale(), r = computeClosedCircuit(config);
  const set = <K extends keyof ClosedCircuitConfig>(key: K, value: ClosedCircuitConfig[K]) => onChange({ ...config, [key]: value });
  const format = (value: number | null) => value === null ? "—" : Number(value.toPrecision(4)).toString();
  const { emf: e, internalResistance: internal, loadResistance: load } = config;
  const iMax = internal > 0 ? Math.max(0.1, e / internal) * 1.08 : Math.max(1, e / Math.max(load, 0.5)) * 1.3, uMax = Math.max(1, e) * 1.2;
  const cp = plotCoordinates(0, iMax, 0, uMax);
  const loadMax = Math.max(10, internal * 4, load * 1.2), powerMax = Math.max(0.1, r.maximumLoadPower ?? closedCircuitLoadPower(e, internal, 0.01) ?? 0) * 1.15;
  const pp = plotCoordinates(0, loadMax, 0, powerMax);
  const points = [...new Set([...Array.from({ length: 400 }, (_, n) => loadMax * (n / 399) ** 3), internal])].filter((v) => v <= loadMax).sort((a, b) => a - b);
  let powerPath = "";
  for (const value of points) { const power = closedCircuitLoadPower(e, internal, value); if (power !== null) powerPath += `${powerPath ? "L" : "M"}${pp.x(value)},${pp.y(power)}`; }
  const warning = r.state === "ideal-short" ? t("理想电源短路：E>0且R+r=0，没有有限稳态解。电流和功率不能写成0。", "Ideal-source short: E>0 with R+r=0 has no finite steady-state solution. Current and power are not zero.") : r.state === "indeterminate" ? t("E=0且总电阻为0，方程不能唯一确定电流。", "With E=0 and zero total resistance, the equation cannot determine a unique current.") : r.state === "open" ? t("断路时 I=0，电源端电压为E；负载电阻电压为0，断开的开关承受E。", "Open circuit: I=0 and source terminal voltage equals E. The resistor voltage is zero; the open switch carries E.") : r.state === "short" ? t("负载短路：端电压为0，电流由内阻限制，电源功率全部消耗在内阻。", "Shorted load: terminal voltage is zero. Internal resistance limits current and dissipates all source power.") : t("闭合回路：I=E/(R+r)，U=E−Ir=IR。负载越大，电流越小，路端电压越接近E。", "Closed circuit: I=E/(R+r), U=E−Ir=IR. Increasing load resistance reduces current and brings terminal voltage closer to E.");
  return <SceneFrame id="physics.closed-circuit" title={t("电源内阻分走了多少功率？", "Where does source power go?")} description={t("从内外电路看电流、路端电压和能量分配；比较高效率与最大输出功率。", "Track current, terminal voltage and energy across internal and external resistance. Compare efficiency with maximum output power.")}
    readouts={[{ label: t("回路电流", "Circuit current"), value: format(r.current), unit: "A" }, { label: t("路端电压", "Terminal voltage"), value: format(r.terminalVoltage), unit: "V" }, { label: t("负载功率", "Load power"), value: format(r.loadPower), unit: "W" }, { label: t("内阻热功率", "Internal heating"), value: format(r.internalPower), unit: "W" }, { label: t("供能效率", "Power efficiency"), value: r.efficiency === null ? "—" : format(r.efficiency * 100), unit: "%" }, { label: t("最大输出功率", "Maximum load power"), value: format(r.maximumLoadPower), unit: "W" }]}
    controls={<>
      <SegmentedControl label={t("观察", "View")} value={config.view} options={[["circuit", t("内外电路", "Circuit")], ["characteristic", t("电源特性", "U–I curves")], ["power", t("功率匹配", "Power matching")]]} onChange={(v) => set("view", v)} />
      <SliderRow label={t("电动势 E", "EMF E")} min={0} max={24} step={0.01} value={e} unit="V" onChange={(v) => set("emf", v)} />
      <SliderRow label={t("电源内阻 r", "Internal resistance r")} min={0} max={10} step={0.01} value={internal} unit="Ω" onChange={(v) => set("internalResistance", v)} />
      <SliderRow label={t("负载电阻 R", "Load resistance R")} min={0} max={100} step={0.01} value={load} unit="Ω" onChange={(v) => set("loadResistance", v)} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: C.muted, fontSize: 12 }}><label><input type="checkbox" checked={config.switchClosed} onChange={(event) => set("switchClosed", event.target.checked)} /> {t("闭合开关", "Close switch")}</label><label><input type="checkbox" checked={config.showPowerBalance} onChange={(event) => set("showPowerBalance", event.target.checked)} /> {t("能量分配", "Power balance")}</label></div>
    </>}
    explanation={<>{warning}<br />{e === 0 ? t("电动势为0，没有电源供能，效率不定义。", "Zero EMF supplies no power, so efficiency is undefined.") : internal > 0 ? t(`固定E和r时，R=r=${internal}Ω获得最大负载功率，效率仅50%；继续增大R可提高效率，但功率最终趋于0。`, `For fixed E and r, R=r=${internal}Ω maximizes load power at 50% efficiency. Increasing R further raises efficiency, while power eventually approaches zero.`) : t("内阻为0的理想源没有有限的最大负载功率；R趋近0的极限不等同于有效短路稳态。", "An ideal source with r=0 has no finite maximum load power. The R→0 limit is not a valid finite short-circuit state.")} {t("图线描述电源/负载的稳态关系，不模拟电池化学和发热温变。功率曲线按闭合状态绘制。", "Curves show steady-state source/load relations; battery chemistry and thermal changes are excluded. The power curve assumes a closed switch.")}</>}>
    {config.view === "characteristic" ? <><CartesianPlot xMin={0} xMax={iMax} yMin={0} yMax={uMax} xLabel="I / A" yLabel="U / V" label={t("电源特性线、负载线和工作点", "Source curve, load line and operating point")}>
      <path d={curvePath((i) => e - internal * i, 0, iMax, 0, uMax)} fill="none" stroke={C.accent} strokeWidth={3} />
      {config.switchClosed ? <path d={curvePath((i) => load * i, 0, iMax, 0, uMax)} fill="none" stroke={C.series2} strokeWidth={2.5} strokeDasharray="7 5" /> : null}
      {r.current !== null && r.terminalVoltage !== null ? <circle cx={cp.x(r.current)} cy={cp.y(r.terminalVoltage)} r={6} fill={C.series1} stroke={C.surface} strokeWidth={2} /> : null}
    </CartesianPlot><p style={{ margin: "0 18px 16px", color: C.muted, fontSize: 12 }}>{t("实线：电源U=E−Ir；虚线：闭合负载U=IR；圆点：当前状态。", "Solid: source U=E−Ir. Dashed: connected load U=IR. Dot: current state.")}</p></> : config.view === "power" ? <CartesianPlot xMin={0} xMax={loadMax} yMin={0} yMax={powerMax} xLabel="R / Ω" yLabel="P / W" label={t("负载功率曲线和最大功率匹配点", "Load power curve and maximum power matching point")}>
      <path d={powerPath} fill="none" stroke={C.accent} strokeWidth={3} />
      {r.matchedResistance !== null && r.maximumLoadPower !== null ? <circle cx={pp.x(r.matchedResistance)} cy={pp.y(r.maximumLoadPower)} r={7} fill={C.series2} /> : null}
      {r.loadPower !== null ? <circle cx={pp.x(load)} cy={pp.y(r.loadPower)} r={5} fill={C.series1} stroke={C.surface} strokeWidth={2} /> : null}
    </CartesianPlot> : <svg viewBox="0 0 680 350" role="img" aria-label={t("含电源内阻、外负载和开关的闭合电路", "Source with internal resistance, external load and switch")} style={{ display: "block", width: "100%" }}>
      <rect x={90} y={57} width={285} height={190} rx={18} fill={C.series1} fillOpacity={0.05} stroke={C.line} strokeDasharray="5 5" />
      <path d="M140,149V108H280M340,108H505V154M505,206V270H410M350,270H140V175" fill="none" stroke={r.current && r.current > 0 ? C.accent : C.muted} strokeWidth={3} />
      <line x1={119} x2={161} y1={149} y2={149} stroke={C.ink} strokeWidth={3} /><line x1={129} x2={151} y1={175} y2={175} stroke={C.ink} strokeWidth={5} />
      <rect x={280} y={94} width={60} height={28} fill={C.surface} stroke={C.series1} strokeWidth={2.5} /><text x={310} y={80} fill={C.series1} fontSize={15} textAnchor="middle">r = {internal} Ω</text>
      <rect x={490} y={154} width={30} height={52} fill={C.surface} stroke={C.series2} strokeWidth={2.5} /><text x={505} y={242} fill={C.series2} fontSize={15} textAnchor="middle">R = {load} Ω</text>
      <text x={140} y={222} fill={C.ink} fontSize={15} textAnchor="middle">E = {e} V</text>
      <circle cx={350} cy={270} r={3} fill={C.ink} /><circle cx={410} cy={270} r={3} fill={C.ink} /><path d={`M350,270L410,${config.switchClosed ? 270 : 248}`} fill="none" stroke={C.accent} strokeWidth={3} />
      <text x={340} y={324} fill={C.muted} fontSize={17} textAnchor="middle">E = Ir + IR</text>
    </svg>}
    {config.showPowerBalance ? <div aria-label={t("功率守恒", "Power conservation")} style={{ margin: "4px 18px 20px", color: C.muted, fontSize: 12, lineHeight: 1.8 }}>
      <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", background: C.line, marginBottom: 8 }}><span style={{ width: `${r.efficiency === null ? 0 : r.efficiency * 100}%`, background: C.accent }} /><span style={{ flex: r.efficiency === null ? 0 : 1, background: C.series2 }} /></div>
      {t("电源总功率", "Source power")} {format(r.sourcePower)} W = {t("负载", "load")} {format(r.loadPower)} W + {t("内耗", "internal loss")} {format(r.internalPower)} W
    </div> : null}
  </SceneFrame>;
}
