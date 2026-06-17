import { z } from "zod";

export const PhysicsBodyZodSchema = z.object({
  id: z.string(),
  shape: z.enum(["circle", "rectangle", "polygon"]),
  x: z.number(),
  y: z.number(),
  radius: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  vertices: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  isStatic: z.boolean().optional(),
  density: z.number().optional(),
  friction: z.number().optional(),
  restitution: z.number().optional(),
  frictionAir: z.number().optional(),
  angle: z.number().optional(),
  velocity: z.object({ x: z.number(), y: z.number() }).optional(),
  label: z.string().optional(),
  render: z.object({
    fillStyle: z.string().optional(),
    strokeStyle: z.string().optional(),
    lineWidth: z.number().optional(),
  }).optional(),
});

export const PhysicsConstraintZodSchema = z.object({
  bodyAId: z.string(),
  bodyBId: z.string().nullable(),
  pointA: z.object({ x: z.number(), y: z.number() }).optional(),
  pointB: z.object({ x: z.number(), y: z.number() }).optional(),
  length: z.number().optional(),
  stiffness: z.number().optional(),
  damping: z.number().optional(),
  render: z.object({
    visible: z.boolean().optional(),
    strokeStyle: z.string().optional(),
    lineWidth: z.number().optional(),
  }).optional(),
});

export const PhysicsSceneZodSchema = z.object({
  gravity: z.object({ x: z.number(), y: z.number() }).optional(),
  walls: z.object({
    top: z.boolean().optional(),
    bottom: z.boolean().optional(),
    left: z.boolean().optional(),
    right: z.boolean().optional(),
  }).optional(),
  bodies: z.array(PhysicsBodyZodSchema),
  constraints: z.array(PhysicsConstraintZodSchema).optional(),
  render: z.object({
    width: z.number(),
    height: z.number(),
    background: z.string().optional(),
  }),
  timeScale: z.number().optional(),
});

// ── Algorithm visualization schemas ──────────────────────────────────────────

export const AlgorithmHighlightRoleSchema = z.enum([
  "comparing", "swapping", "pivot", "sorted",
  "current", "visited", "queued", "stacked", "path",
  "dependency", "result", "muted",
]);

export const AlgorithmArrayStateSchema = z.object({
  values: z.array(z.union([z.number(), z.string()])),
  highlights: z.array(z.object({ index: z.number(), role: AlgorithmHighlightRoleSchema })).optional(),
  pointers: z.array(z.object({ index: z.number(), label: z.string() })).optional(),
  sortedIndices: z.array(z.number()).optional(),
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
    x: z.number(),
    y: z.number(),
    value: z.union([z.number(), z.string()]).optional(),
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    directed: z.boolean().optional(),
    weight: z.number().optional(),
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
  highlights: z.array(z.object({ row: z.number(), col: z.number(), role: AlgorithmHighlightRoleSchema })).optional(),
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
  min: z.number(),
  max: z.number(),
  default: z.number(),
  step: z.number().optional(),
});

export const MathExplorerZodSchema = z.object({
  type: z.literal("math_explorer"),
  title: z.string(),
  description: z.string(),
  mode: z.enum(["cartesian", "parametric"]).optional(),
  functions: z.array(MathExplorerFunctionSchema).optional(),
  curves: z.array(MathExplorerCurveSchema).optional(),
  parameters: z.array(MathExplorerParameterSchema).max(6),
  xRange: z.tuple([z.number(), z.number()]).optional(),
  yRange: z.tuple([z.number(), z.number()]).optional(),
  tRange: z.tuple([z.number(), z.number()]).optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
});
