import { z } from "zod";

// Standalone numeric fields use z.coerce.number() so a model that quotes its
// numbers ("5") still validates instead of failing the whole visual block. Union
// number|string fields (array values, node ids/values) are intentionally LEFT as
// z.number() inside the union — coercing them would turn a legit non-numeric
// label ("a") into NaN.
const num = z.coerce.number();

export const PhysicsBodyZodSchema = z.object({
  id: z.string(),
  shape: z.enum(["circle", "rectangle", "polygon"]),
  x: num,
  y: num,
  radius: num.optional(),
  width: num.optional(),
  height: num.optional(),
  vertices: z.array(z.object({ x: num, y: num })).optional(),
  isStatic: z.boolean().optional(),
  density: num.optional(),
  friction: num.optional(),
  restitution: num.optional(),
  frictionAir: num.optional(),
  angle: num.optional(),
  velocity: z.object({ x: num, y: num }).optional(),
  label: z.string().optional(),
  render: z.object({
    fillStyle: z.string().optional(),
    strokeStyle: z.string().optional(),
    lineWidth: num.optional(),
  }).optional(),
});

export const PhysicsConstraintZodSchema = z.object({
  bodyAId: z.string(),
  bodyBId: z.string().nullable(),
  pointA: z.object({ x: num, y: num }).optional(),
  pointB: z.object({ x: num, y: num }).optional(),
  length: num.optional(),
  stiffness: num.optional(),
  damping: num.optional(),
  render: z.object({
    visible: z.boolean().optional(),
    strokeStyle: z.string().optional(),
    lineWidth: num.optional(),
  }).optional(),
});

export const PhysicsSceneZodSchema = z.object({
  gravity: z.object({ x: num, y: num }).optional(),
  walls: z.object({
    top: z.boolean().optional(),
    bottom: z.boolean().optional(),
    left: z.boolean().optional(),
    right: z.boolean().optional(),
  }).optional(),
  bodies: z.array(PhysicsBodyZodSchema),
  constraints: z.array(PhysicsConstraintZodSchema).optional(),
  render: z.object({
    width: num,
    height: num,
    background: z.string().optional(),
  }),
  timeScale: num.optional(),
});

// ── Algorithm visualization schemas ──────────────────────────────────────────

export const AlgorithmHighlightRoleSchema = z.enum([
  "comparing", "swapping", "pivot", "sorted",
  "current", "visited", "queued", "stacked", "path",
  "dependency", "result", "muted",
]);

export const AlgorithmArrayStateSchema = z.object({
  values: z.array(z.union([z.number(), z.string()])),
  highlights: z.array(z.object({ index: num, role: AlgorithmHighlightRoleSchema })).optional(),
  pointers: z.array(z.object({ index: num, label: z.string() })).optional(),
  sortedIndices: z.array(num).optional(),
});

export const AlgorithmTreeStateSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    value: z.union([z.number(), z.string()]),
    parentId: z.string().nullable().optional(),
    left: z.string().nullable().optional(),
    right: z.string().nullable().optional(),
  })),
  highlights: z.array(z.object({ id: z.string(), role: AlgorithmHighlightRoleSchema })).optional(),
  traversalPath: z.array(z.string()).optional(),
});

export const AlgorithmGraphStateSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    x: num,
    y: num,
    value: z.union([z.number(), z.string()]).optional(),
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    directed: z.boolean().optional(),
    weight: num.optional(),
  })),
  highlights: z.array(z.object({
    nodeId: z.string().optional(),
    edgeKey: z.string().optional(),
    role: AlgorithmHighlightRoleSchema,
  })).optional(),
  queue: z.array(z.string()).optional(),
  stack: z.array(z.string()).optional(),
  distances: z.array(z.object({ nodeId: z.string(), value: z.union([z.number(), z.string()]) })).optional(),
});

export const AlgorithmTableStateSchema = z.object({
  data: z.array(z.array(z.union([z.number(), z.string(), z.null()]))),
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
  highlights: z.array(z.object({ row: num, col: num, role: AlgorithmHighlightRoleSchema })).optional(),
  formula: z.string().optional(),
});

export const AlgorithmStepZodSchema = z.object({
  description: z.string(),
  annotation: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).optional(),
  kind: z.enum(["array", "tree", "graph", "table"]),
  array: AlgorithmArrayStateSchema.optional(),
  tree: AlgorithmTreeStateSchema.optional(),
  graph: AlgorithmGraphStateSchema.optional(),
  table: AlgorithmTableStateSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.kind === "array" && !data.array) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["array"], message: `step with kind "array" must include an "array" object, e.g. "array":{"values":[...]}` });
  }
  if (data.kind === "tree" && !data.tree) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tree"], message: `step with kind "tree" must include a "tree" object with a "nodes" array` });
  }
  if (data.kind === "graph" && !data.graph) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["graph"], message: `step with kind "graph" must include a "graph" object with "nodes" and "edges"` });
  }
  if (data.kind === "table" && !data.table) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["table"], message: `step with kind "table" must include a "table" object with a "data" 2D array` });
  }
});

export const AlgorithmVisualizationZodSchema = z.object({
  type: z.literal("algorithm_visualization"),
  title: z.string(),
  description: z.string(),
  algorithm: z.string(),
  steps: z.array(AlgorithmStepZodSchema).min(1).max(60),
});

// ── Math Explorer schemas ─────────────────────────────────────────────────────

export const MathExplorerFunctionSchema = z.object({
  expr: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  dashed: z.boolean().optional(),
});

export const MathExplorerCurveSchema = z.object({
  xExpr: z.string(),
  yExpr: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const MathExplorerParameterSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  min: num,
  max: num,
  default: num,
  step: num.optional(),
});

export const MathExplorerZodSchema = z.object({
  type: z.literal("math_explorer"),
  title: z.string(),
  description: z.string(),
  mode: z.enum(["cartesian", "parametric"]).optional(),
  functions: z.array(MathExplorerFunctionSchema).optional(),
  curves: z.array(MathExplorerCurveSchema).optional(),
  parameters: z.array(MathExplorerParameterSchema).max(6),
  xRange: z.tuple([num, num]).optional(),
  yRange: z.tuple([num, num]).optional(),
  tRange: z.tuple([num, num]).optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
});
