import { z } from "zod";
import type { ImplementedComponent } from "./types";

const twelveNumbers = z.array(z.number().finite()).length(12);
const PlaceSchema = z.object({ name: z.string().min(1).max(100), latitudeDeg: z.number().min(-90).max(90), elevationM: z.number().min(-500).max(9000), monthlyTemperatureC: twelveNumbers, monthlyPrecipitationMm: z.array(z.number().min(0).max(5000)).length(12) });
const DEFAULT_PLACES = [
  { name: "Coastal place", latitudeDeg: 1, elevationM: 15, monthlyTemperatureC: [27,27,28,28,28,28,28,28,28,28,27,27], monthlyPrecipitationMm: [240,170,190,180,170,160,150,160,180,200,250,260] },
  { name: "Continental place", latitudeDeg: 40, elevationM: 300, monthlyTemperatureC: [-2,1,7,14,20,25,28,27,22,15,7,1], monthlyPrecipitationMm: [25,28,35,45,55,65,70,60,48,38,30,26] },
];
const focusSchema = z.enum(["temperature-range", "precipitation-seasonality", "hemisphere", "continentality"]);
export const ClimateComparisonConfigSchema = z.object({ places: z.array(PlaceSchema).min(2).max(3).default(DEFAULT_PLACES), comparisonFocus: focusSchema.default("continentality") });
export type ClimateComparisonConfig = z.infer<typeof ClimateComparisonConfigSchema>;
export const ClimateComparisonPatchSchema = z.object({ places: z.array(PlaceSchema).min(2).max(3), comparisonFocus: focusSchema }).partial();
export const DEFAULT_CLIMATE_COMPARISON_CONFIG = ClimateComparisonConfigSchema.parse({});

export function summarizeClimate(config: ClimateComparisonConfig) {
  return config.places.map((place) => {
    const meanTemperatureC = place.monthlyTemperatureC.reduce((sum, value) => sum + value, 0) / 12;
    const temperatureRangeC = Math.max(...place.monthlyTemperatureC) - Math.min(...place.monthlyTemperatureC);
    const annualPrecipitationMm = place.monthlyPrecipitationMm.reduce((sum, value) => sum + value, 0);
    return { ...place, meanTemperatureC, temperatureRangeC, annualPrecipitationMm };
  });
}

export const climateComparisonComponent: ImplementedComponent = {
  implemented: true, componentId: "geography.climate-comparison", name: "气候特征比较",
  catalogDescription: "比较两到三个地点的月度气温、降水与季节性",
  configSchema: ClimateComparisonConfigSchema, patchSchema: ClimateComparisonPatchSchema,
  schemaDoc: `geography.climate-comparison 的 config 字段(全部字段都有默认值,只写有把握的字段):
- places: 2~3 个地点;每项含 name、latitudeDeg(纬度 [-90,90],南纬为负)、elevationM(海拔米 [-500,9000])、monthlyTemperatureC(12 个月均温 °C)、monthlyPrecipitationMm(12 个月降水 mm,每月 [0,5000]),整体替换
- comparisonFocus: 比较重点,"temperature-range"(年温差)|"precipitation-seasonality"(降水季节性)|"hemisphere"(南北半球)|"continentality"(大陆性),默认 "continentality"`,
  patchHints: `「重点看降水」只改 comparisonFocus 为 "precipitation-seasonality";「换成南半球城市」替换对应 place 且 latitudeDeg 为负、气温相位相反;增加地点必须给全 12 个月数据。`,
};
