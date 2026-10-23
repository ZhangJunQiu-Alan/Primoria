"use client";

import { computeEarthSeasons, type EarthSeasonsConfig } from "@/lib/interactive/components/earth-seasons";
import { WIDGET_COLORS as C } from "./palette";
import { SegmentedControl, SliderRow } from "./primitives/controls";
import { CartesianPlot, curvePath, plotCoordinates, SceneFrame, useSceneLocale } from "./primitives/scene-frame";

export function EarthSeasonsWidget({ config, onChange }: { config: EarthSeasonsConfig; onChange: (next: EarthSeasonsConfig) => void }) {
  const t = useSceneLocale();
  const r = computeEarthSeasons(config);
  const set = <K extends keyof EarthSeasonsConfig>(key: K, value: EarthSeasonsConfig[K]) => onChange({ ...config, [key]: value });
  const p = plotCoordinates(0, 24, -90, 90);
  const ex = 260 + 110 * Math.cos(r.orbitalAngle), ey = 160 + 110 * Math.sin(r.orbitalAngle);
  return <SceneFrame id="geography.earth-seasons" title={t("四季来自倾斜的地轴", "Seasons begin with a tilted axis")} description={t("固定地轴朝向，改变公转位置与观测纬度，连接太阳高度和昼夜长短。", "Keep the axis orientation fixed and connect orbital position, latitude, solar altitude and daylight.")}
    readouts={[{ label: t("太阳赤纬", "Declination"), value: r.declinationDeg.toFixed(2), unit: "°" }, { label: t("白昼长度", "Daylight"), value: r.daylightHours.toFixed(2), unit: "h" }, { label: t("正午太阳高度", "Noon altitude"), value: r.noonAltitude.toFixed(1), unit: "°" }, { label: t("当前高度", "Current altitude"), value: r.altitude.toFixed(1), unit: "°" }]}
    controls={<>
      <SliderRow label={t("年内日序", "Day of year")} min={1} max={365} step={1} value={config.dayOfYear} onChange={(v) => set("dayOfYear", v)} />
      <SliderRow label={t("纬度", "Latitude")} min={-90} max={90} step={1} value={config.latitude} unit="°" onChange={(v) => set("latitude", v)} />
      <SliderRow label={t("地轴倾角", "Axial tilt")} min={0} max={35} step={0.1} value={config.axialTilt} unit="°" onChange={(v) => set("axialTilt", v)} />
      <SliderRow label={t("太阳时", "Solar time")} min={0} max={24} step={0.1} value={config.localHour} unit="h" onChange={(v) => set("localHour", v)} />
      <SegmentedControl label={t("观察", "View")} value={config.view} options={[["altitude", t("一日太阳高度", "Daily altitude")], ["orbit", t("公转位置", "Orbit")]]} onChange={(v) => set("view", v)} />
      <label style={{ fontSize: 12, color: C.muted }}><input type="checkbox" checked={config.showLabels} onChange={(e) => set("showLabels", e.target.checked)} />{t("显示标注", "Show labels")}</label>
    </>}
    explanation={t("同一天南北半球季节相反，主因是地轴倾角改变光照角度与白昼长度，并非太阳距离远近。曲线在地平线之上为白昼。模型忽略大气折射；在极点的春秋分采用12小时的极限约定。", "Opposite hemispheres have opposite seasons because tilt changes sunlight angle and day length, rather than distance to the Sun. Positive altitude means daylight. The model omits refraction and uses a 12-hour limiting convention at the poles on an equinox.")}>
    {config.view === "altitude" ? <CartesianPlot xMin={0} xMax={24} yMin={-90} yMax={90} xLabel={t("当地太阳时 / h", "Local solar time / h")} yLabel={t("太阳高度 / °", "Altitude / °")} label={t("太阳高度随当地太阳时的变化", "Solar altitude through the day")}>
      <path d={curvePath(r.altitudeAtHour, 0, 24, -90, 90)} fill="none" stroke={C.series1} strokeWidth={3} />
      <circle cx={p.x(config.localHour)} cy={p.y(r.altitude)} r={6} fill={C.series1} stroke={C.surface} strokeWidth={2} />
      {config.showLabels ? <text x={p.x(12)} y={p.y(0) - 10} textAnchor="middle" fill={C.muted} fontSize={12}>{t("地平线", "Horizon")}</text> : null}
    </CartesianPlot> : <svg viewBox="0 0 680 330" role="img" aria-label={t("圆轨道俯视示意，地轴投影朝向保持不变", "Top-down circular orbit; projected axis orientation stays fixed")} style={{ width: "100%", display: "block" }}>
      <circle cx={260} cy={160} r={110} fill="none" stroke={C.line} strokeDasharray="4 6" /><circle cx={260} cy={160} r={30} fill={C.series1} fillOpacity={0.2} stroke={C.series1} />
      <path d={`M260,160L${ex},${ey}`} stroke={C.series1} strokeDasharray="5 4" />
      <circle cx={ex} cy={ey} r={23} fill={C.series2} /><line x1={ex} x2={ex} y1={ey - 37} y2={ey + 37} stroke={C.accent} strokeWidth={2} /><path d={`M${ex - 4},${ey - 32}l4,-7l4,7`} stroke={C.accent} fill="none" />
      {config.showLabels ? <><text x={260} y={165} fill={C.series1} fontSize={12} textAnchor="middle">{t("太阳", "Sun")}</text><text x={ex + 32} y={ey - 23} fill={C.accent} fontSize={12}>N</text><text x={470} y={95} fill={C.ink} fontSize={16}>{t("地轴投影始终同向", "Fixed axis projection")}</text><text x={470} y={126} fill={C.muted} fontSize={12}>δ = {r.declinationDeg.toFixed(2)}°</text><text x={340} y={298} textAnchor="middle" fill={C.muted} fontSize={12}>{t("非距离与大小比例图", "Sizes and distances not to scale")}</text></> : null}
    </svg>}
  </SceneFrame>;
}
