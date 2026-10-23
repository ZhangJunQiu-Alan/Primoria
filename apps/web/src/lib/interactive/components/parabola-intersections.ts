import { z } from "zod";
import type { ImplementedComponent } from "./types";
import { solveQuadraticCoefficients } from "./quadratic-equation";

const onGrid = (value: number) => Math.abs(value - Math.round(value * 100) / 100) <= Number.EPSILON * Math.abs(value) * 8;
const coefficient = (limit: number) => z.number().min(-limit).max(limit).multipleOf(0.01).refine(onGrid, "Use increments of 0.01");
const fields = { a: coefficient(4), b: coefficient(12), c: coefficient(12), slope: coefficient(4), intercept: coefficient(12), scene: z.enum(["horizontal", "line", "bridge"]), showDistance: z.boolean() };
export const ParabolaIntersectionsConfigSchema = z.object({ a: fields.a.default(1), b: fields.b.default(0), c: fields.c.default(-4), slope: fields.slope.default(0), intercept: fields.intercept.default(0), scene: fields.scene.default("horizontal"), showDistance: fields.showDistance.default(true) }).strict();
export const ParabolaIntersectionsPatchSchema = z.object(fields).partial().strict();
export type ParabolaIntersectionsConfig = z.infer<typeof ParabolaIntersectionsConfigSchema>;
export const DEFAULT_PARABOLA_INTERSECTIONS_CONFIG = ParabolaIntersectionsConfigSchema.parse({});

export function computeParabolaIntersections(config: ParabolaIntersectionsConfig) {
  const slope = config.scene === "line" ? config.slope : 0;
  const reducedB = (Math.round(config.b * 100) - Math.round(slope * 100)) / 100;
  const reducedC = (Math.round(config.c * 100) - Math.round(config.intercept * 100)) / 100;
  const result = solveQuadraticCoefficients(config.a, reducedB, reducedC);
  const original = solveQuadraticCoefficients(config.a, config.b, config.c), vertex = original.vertex;
  const points = result.roots.map((x) => ({ x, y: slope * x + config.intercept }));
  const gap = result.kind === "repeated" ? 0 : points.length === 2 ? Math.abs(points[1].x - points[0].x) : null;
  return { ...result, slope, reducedB, reducedC, vertex, foundationRoots: original.roots, points, gap, chord: gap === null ? null : gap * Math.hypot(1, slope),
    rootSum: config.a !== 0 && result.kind !== "complex" ? reducedB === 0 ? 0 : -reducedB / config.a : null,
    rootProduct: config.a !== 0 && result.kind !== "complex" ? reducedC === 0 ? 0 : reducedC / config.a : null,
    bridgeValid: config.scene === "bridge" && config.a < 0 && vertex !== null && vertex.y > 0 && config.intercept >= 0 };
}

export const parabolaIntersectionsComponent: ImplementedComponent = {
  implemented: true, componentId: "math.parabola-intersections", name: "抛物线求交与拱桥水位", catalogDescription: "水平线或斜线求交、移项判别式、韦达根距与桥孔水位宽度",
  configSchema: ParabolaIntersectionsConfigSchema, patchSchema: ParabolaIntersectionsPatchSchema,
  schemaDoc: "math.parabola-intersections config：a[-4,4]默认1；b,c[-12,12]默认0,-4；slope[-4,4]默认0；intercept[-12,12]默认0；五个数值均为0.01格点。scene=horizontal|line|bridge默认horizontal；showDistance默认true。只在线模式应用slope，其他模式斜率为0。求ax²+bx+c=slope*x+intercept。桥孔近似要求向下开口、顶点高度正且水位非负；其他参数仍按函数求交解释。",
  patchHints: "拱桥示例a=-0.4,b=0,c=9,intercept=3；韦达与根距使用移项后的b-slope与c-intercept，不能继续套用原式b,c。横坐标差与斜弦长度分开。普通ax²+bx+c=0及复根优先用math.quadratic-equation。",
};
