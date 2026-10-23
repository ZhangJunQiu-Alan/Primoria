import { z } from "zod";
import type { ImplementedComponent } from "./types";

const fields = { dayOfYear: z.number().int().min(1).max(365), latitude: z.number().min(-90).max(90), axialTilt: z.number().min(0).max(35), localHour: z.number().min(0).max(24), view: z.enum(["altitude", "orbit"]), showLabels: z.boolean() };
export const EarthSeasonsConfigSchema = z.object({ dayOfYear: fields.dayOfYear.default(172), latitude: fields.latitude.default(40), axialTilt: fields.axialTilt.default(23.44), localHour: fields.localHour.default(12), view: fields.view.default("altitude"), showLabels: fields.showLabels.default(true) }).strict();
export const EarthSeasonsPatchSchema = z.object(fields).partial().strict();
export type EarthSeasonsConfig = z.infer<typeof EarthSeasonsConfigSchema>;
export const DEFAULT_EARTH_SEASONS_CONFIG = EarthSeasonsConfigSchema.parse({});

export function computeEarthSeasons(config: EarthSeasonsConfig) {
  const rad = Math.PI / 180;
  const orbitalAngle = 2 * Math.PI * (config.dayOfYear - 80) / 365;
  const declination = Math.asin(Math.sin(config.axialTilt * rad) * Math.sin(orbitalAngle));
  const phi = config.latitude * rad;
  const a = Math.sin(phi) * Math.sin(declination), b = Math.cos(phi) * Math.cos(declination);
  const sunsetAngle = Math.abs(b) < 1e-12 ? a > 1e-12 ? Math.PI : a < -1e-12 ? 0 : Math.PI / 2 : Math.acos(Math.max(-1, Math.min(1, -a / b)));
  const altitudeAtHour = (hour: number) => Math.asin(Math.max(-1, Math.min(1, a + b * Math.cos((hour - 12) * Math.PI / 12)))) / rad;
  return { orbitalAngle, declinationDeg: declination / rad, daylightHours: 24 * sunsetAngle / Math.PI,
    noonAltitude: altitudeAtHour(12), altitude: altitudeAtHour(config.localHour), altitudeAtHour,
    dailyMeanFlux: 1361 / Math.PI * (sunsetAngle * a + b * Math.sin(sunsetAngle)) };
}

export const earthSeasonsComponent: ImplementedComponent = {
  implemented: true, componentId: "geography.earth-seasons", name: "四季与昼夜长短", catalogDescription: "地轴倾角、太阳高度、纬度与极昼极夜联动",
  configSchema: EarthSeasonsConfigSchema, patchSchema: EarthSeasonsPatchSchema,
  schemaDoc: `geography.earth-seasons config：dayOfYear [1,365]整数 默认172；latitude [-90,90]°北正南负 默认40；axialTilt [0,35]° 默认23.44；localHour [0,24]当地太阳时 默认12；view=altitude|orbit 默认altitude；showLabels 默认true。圆轨道、365天、春分约第80天；忽略大气折射和太阳视半径，不是实时天文历。`,
  patchHints: "北半球夏至约172天，冬至约355天；比较南北半球时改变latitude符号；axialTilt=0消除倾角引起的季节变化。",
};
