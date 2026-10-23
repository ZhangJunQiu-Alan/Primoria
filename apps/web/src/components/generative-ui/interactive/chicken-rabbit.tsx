"use client";

import { computeChickenRabbit, type ChickenRabbitConfig } from "@/lib/interactive/components/chicken-rabbit";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function ChickenRabbitWidget({ config, onChange }: { config: ChickenRabbitConfig; onChange: (next: ChickenRabbitConfig) => void }) {
  const t = useSceneLocale();
  const r = computeChickenRabbit(config);
  const set = <K extends keyof ChickenRabbitConfig>(key: K, value: ChickenRabbitConfig[K]) => onChange({ ...config, [key]: value });
  const reason = r.reason === "odd-legs" ? t("脚数为奇数", "Odd number of legs") : r.reason === "too-few" ? t("比全是鸡还少", "Fewer than all chickens") : t("比全是兔还多", "More than all rabbits");
  return <SceneFrame id="math.chicken-rabbit" title={t("一只鸡换成兔，多了什么？", "Replace a chicken with a rabbit")} description={t("保持头数不变，用每次增加的两只脚寻找数量关系。", "Keep the head count fixed and track the two extra legs per replacement.")}
    readouts={[{ label: t("鸡", "Chickens"), value: r.chickens ?? "—" }, { label: t("兔", "Rabbits"), value: r.rabbits ?? "—" }, { label: t("条件", "Conditions"), value: r.valid ? t("有整数解", "Integer solution") : reason }]}
    controls={<><SliderRow label={t("头数", "Heads")} min={1} max={30} step={1} value={config.heads} onChange={(v) => set("heads", v)} /><SliderRow label={t("脚数", "Legs")} min={0} max={120} step={1} value={config.legs} onChange={(v) => set("legs", v)} /><SegmentedControl label={t("模型", "Model")} value={config.view} options={[["animals", t("动物模型", "Animals")], ["equations", t("方程模型", "Equations")]]} onChange={(v) => set("view", v)} /><label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showSteps} onChange={(e) => set("showSteps", e.target.checked)} /> {t("显示推理", "Show reasoning")}</label></>}
    explanation={!r.valid ? `${t("这些条件没有非负整数解：", "No nonnegative integer solution: ")}${reason}。${t("不能通过四舍五入得到半只鸡或半只兔。", "Rounding cannot produce a valid animal count.")}` : config.showSteps ? `${t("先假设全是鸡：", "Assume all are chickens: ")}${config.heads} × 2 = ${r.allChickenLegs}。${t("多出的脚：", "Extra legs: ")}${config.legs} − ${r.allChickenLegs} = ${r.extraLegs}。${t("每换一只兔多2脚，所以兔有", "Each rabbit adds 2 legs, so rabbits = ")}${r.extraLegs} ÷ 2 = ${r.rabbits}。` : t("改变一个条件，检查头数和脚数是否仍同时满足。", "Change one constraint and check whether both equations still hold.")}>
    <svg viewBox={`0 0 680 ${config.view === "animals" && r.valid ? 70 + Math.ceil(config.heads / 10) * 80 : 260}`} role="img" aria-label={t("鸡兔数量模型", "Chicken-rabbit count model")} style={{ width: "100%", display: "block" }}>
      {r.valid && config.view === "animals" ? Array.from({ length: config.heads }, (_, i) => {
        const rabbit = i >= (r.chickens ?? 0), x = 51 + i % 10 * 64, y = 48 + Math.floor(i / 10) * 80;
        return <g key={i}><circle cx={x} cy={y} r={18} fill={rabbit ? C.accentSoft : C.surfaceSoft} stroke={rabbit ? C.accent : C.series1} strokeWidth={2} />{rabbit ? <><ellipse cx={x - 7} cy={y - 23} rx={4} ry={12} fill={C.accentSoft} stroke={C.accent} /><ellipse cx={x + 7} cy={y - 23} rx={4} ry={12} fill={C.accentSoft} stroke={C.accent} /></> : <path d={`M${x + 16},${y - 5}l10,5l-10,5`} fill={C.series1} />}<circle cx={x + 5} cy={y - 4} r={2} fill={C.ink} /><text x={x} y={y + 37} textAnchor="middle" fill={C.muted} fontSize={12}>{rabbit ? "4" : "2"} {t("脚", "legs")}</text></g>;
      }) : <><text x={340} y={72} textAnchor="middle" fontSize={26} fill={C.series2}>x + y = {config.heads}</text><text x={340} y={126} textAnchor="middle" fontSize={26} fill={C.accent}>2x + 4y = {config.legs}</text><text x={340} y={187} textAnchor="middle" fontSize={18} fill={r.valid ? C.ink : C.warn}>{r.valid ? `x = ${r.chickens}，y = ${r.rabbits}` : reason}</text><text x={340} y={224} textAnchor="middle" fontSize={12} fill={C.muted}>{t("x 是鸡数，y 是兔数；两者均为非负整数", "x = chickens, y = rabbits; both are nonnegative integers")}</text></>}
    </svg>
  </SceneFrame>;
}
