import { z } from "zod";

export type WidgetDependencyKind = "script" | "module" | "style";

export type WidgetDependency = {
  url: string;
  global?: string;
  kind?: WidgetDependencyKind;
};

export type CourseBlockType = "text" | "analogy" | "transfer" | "visual" | "code" | "quiz" | "mind_map" | "slide" | "worksheet";

export type CourseOutlineItem = {
  type: CourseBlockType;
  title: string;
};

export type HtmlWidgetArtifact = {
  type: "html_widget";
  title: string;
  description: string;
  html: string;
  dependencies?: WidgetDependency[];
  generationPlan?: unknown;
};

export type VisualizationPlanArtifact = {
  type: "visualization_plan";
  title: string;
  approach: string;
  technology: string;
  keyElements: string[];
};

export type CodeArtifact = {
  type: "code";
  title: string;
  language: string;
  code: string;
};

export type CourseCardArtifact = {
  type: "course_card";
  courseId: string;
  title: string;
  topic: string;
  summary: string;
  estimatedMinutes: number;
  outline: CourseOutlineItem[];
  status: "generating" | "ready";
};

export type TodoListItem = {
  title: string;
  status: "pending" | "in_progress" | "done";
};

export type TodoListArtifact = {
  type: "todo_list";
  items: TodoListItem[];
};

export type ToolStatusArtifact = {
  type: "tool_status";
  name: "deep_agent" | "plan_visualization" | "render_interactive_widget" | "generate_course" | string;
  status: "executing" | "complete" | "error";
  description: string;
};

export type EChartsArtifact = {
  type: "echarts_widget";
  title: string;
  description: string;
  option: Record<string, unknown>;
  height?: number;
};

export type MermaidArtifact = {
  type: "mermaid_diagram";
  title: string;
  definition: string;
};

export type PhysicsBody = {
  id: string;
  shape: "circle" | "rectangle" | "polygon";
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  vertices?: Array<{ x: number; y: number }>;
  isStatic?: boolean;
  density?: number;
  friction?: number;
  restitution?: number;
  frictionAir?: number;
  angle?: number;
  velocity?: { x: number; y: number };
  label?: string;
  render?: { fillStyle?: string; strokeStyle?: string; lineWidth?: number };
};

export type PhysicsConstraint = {
  bodyAId: string;
  bodyBId: string | null;
  pointA?: { x: number; y: number };
  pointB?: { x: number; y: number };
  length?: number;
  stiffness?: number;
  damping?: number;
  render?: { visible?: boolean; strokeStyle?: string; lineWidth?: number };
};

export type PhysicsScene = {
  gravity?: { x: number; y: number };
  walls?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean };
  bodies: PhysicsBody[];
  constraints?: PhysicsConstraint[];
  render: { width: number; height: number; background?: string };
  timeScale?: number;
};

export type PhysicsSceneArtifact = {
  type: "physics_scene";
  title: string;
  description: string;
  scene: PhysicsScene;
};

export type AlgorithmHighlightRole =
  | "comparing" | "swapping" | "pivot" | "sorted"
  | "current" | "visited" | "queued" | "stacked" | "path"
  | "dependency" | "result" | "muted";

export type AlgorithmArrayState = {
  values: (number | string)[];
  highlights?: { index: number; role: AlgorithmHighlightRole }[];
  pointers?: { index: number; label: string }[];
  sortedIndices?: number[];
};

export type AlgorithmTreeNode = {
  id: string;
  value: number | string;
  parentId?: string | null;
  left?: string | null;
  right?: string | null;
};

export type AlgorithmTreeState = {
  nodes: AlgorithmTreeNode[];
  highlights?: { id: string; role: AlgorithmHighlightRole }[];
  traversalPath?: string[];
};

export type AlgorithmGraphNode = { id: string; label: string; x: number; y: number; value?: number | string };
export type AlgorithmGraphEdge = { from: string; to: string; directed?: boolean; weight?: number };

export type AlgorithmGraphState = {
  nodes: AlgorithmGraphNode[];
  edges: AlgorithmGraphEdge[];
  highlights?: { nodeId?: string; edgeKey?: string; role: AlgorithmHighlightRole }[];
  queue?: string[];
  stack?: string[];
  distances?: { nodeId: string; value: number | string }[];
};

export type AlgorithmTableState = {
  data: (number | string | null)[][];
  rowLabels?: string[];
  colLabels?: string[];
  highlights?: { row: number; col: number; role: AlgorithmHighlightRole }[];
  formula?: string;
};

export type AlgorithmStep = {
  description: string;
  annotation?: string;
  variables?: { name: string; value: string | number | boolean }[];
  kind: "array" | "tree" | "graph" | "table";
  array?: AlgorithmArrayState;
  tree?: AlgorithmTreeState;
  graph?: AlgorithmGraphState;
  table?: AlgorithmTableState;
};

export type AlgorithmVisualizationArtifact = {
  type: "algorithm_visualization";
  title: string;
  description: string;
  algorithm: string;
  steps: AlgorithmStep[];
};

export type MathExplorerFunction = {
  expr: string;
  label?: string;
  color?: string;
  dashed?: boolean;
};

export type MathExplorerCurve = {
  xExpr: string;
  yExpr: string;
  label?: string;
  color?: string;
};

export type MathExplorerParameter = {
  name: string;
  label?: string;
  min: number;
  max: number;
  default: number;
  step?: number;
};

export type MathExplorerArtifact = {
  type: "math_explorer";
  title: string;
  description: string;
  mode?: "cartesian" | "parametric";
  functions?: MathExplorerFunction[];
  curves?: MathExplorerCurve[];
  parameters: MathExplorerParameter[];
  xRange?: [number, number];
  yRange?: [number, number];
  tRange?: [number, number];
  xLabel?: string;
  yLabel?: string;
};

export type WaveComponent = {
  label?: string;
  amplitude: number;
  frequency: number;
  phase?: number;
  kind?: "sine" | "square" | "sawtooth" | "triangle";
  color?: string;
};

export type WaveLayout = "superposition" | "beat" | "standing";

export type WaveVisualizationArtifact = {
  type: "wave_visualization";
  title: string;
  description: string;
  waves: WaveComponent[];
  layout: WaveLayout;
  timeScale?: number;
  audioEnabled?: boolean;
  audioFrequencies?: number[];
};

export type GraphNode = {
  id: string;
  label?: string;
  group?: string;
  size?: number;
  color?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  label?: string;
  weight?: number;
  directed?: boolean;
};

export type GraphLayout = "force" | "tree" | "circle" | "grid";

export type GraphVisualizationArtifact = {
  type: "graph_visualization";
  title: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean;
  layout?: GraphLayout;
};

export type MoleculeAtom = {
  id: string;
  element: string;
  x: number;
  y: number;
  z: number;
  label?: string;
  charge?: number;
};

export type MoleculeBond = {
  atomA: string;
  atomB: string;
  order?: 1 | 2 | 3;
};

export type MoleculeArtifact = {
  type: "molecule";
  title: string;
  description: string;
  atoms: MoleculeAtom[];
  bonds: MoleculeBond[];
  representation?: "ball_stick" | "stick" | "sphere";
};

export type TutorArtifact =
  | HtmlWidgetArtifact
  | VisualizationPlanArtifact
  | CodeArtifact
  | CourseCardArtifact
  | TodoListArtifact
  | ToolStatusArtifact
  | EChartsArtifact
  | MermaidArtifact
  | PhysicsSceneArtifact
  | AlgorithmVisualizationArtifact
  | MathExplorerArtifact
  | WaveVisualizationArtifact
  | GraphVisualizationArtifact
  | MoleculeArtifact;

export const WidgetDependencySchema = z.object({
  url: z.string(),
  global: z.string().optional(),
  kind: z.enum(["script", "module", "style"]).optional(),
}) satisfies z.ZodType<WidgetDependency>;

export const CourseBlockTypeSchema = z.enum([
  "text",
  "analogy",
  "transfer",
  "visual",
  "code",
  "quiz",
  "mind_map",
  "slide",
  "worksheet",
]);

export const CourseOutlineItemSchema = z.object({
  type: CourseBlockTypeSchema,
  title: z.string(),
}) satisfies z.ZodType<CourseOutlineItem>;

export const HtmlWidgetArtifactSchema = z.object({
  type: z.literal("html_widget"),
  title: z.string(),
  description: z.string(),
  html: z.string(),
  dependencies: z.array(WidgetDependencySchema).optional(),
  generationPlan: z.unknown().optional(),
}) satisfies z.ZodType<HtmlWidgetArtifact>;

export const VisualizationPlanArtifactSchema = z.object({
  type: z.literal("visualization_plan"),
  title: z.string(),
  approach: z.string(),
  technology: z.string(),
  keyElements: z.array(z.string()),
}) satisfies z.ZodType<VisualizationPlanArtifact>;

export const CodeArtifactSchema = z.object({
  type: z.literal("code"),
  title: z.string(),
  language: z.string(),
  code: z.string(),
}) satisfies z.ZodType<CodeArtifact>;

export const CourseCardArtifactSchema = z.object({
  type: z.literal("course_card"),
  courseId: z.string(),
  title: z.string(),
  topic: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number(),
  outline: z.array(CourseOutlineItemSchema),
  status: z.enum(["generating", "ready"]),
}) satisfies z.ZodType<CourseCardArtifact>;

const TodoListItemSchema = z.object({
  title: z.string(),
  status: z.enum(["pending", "in_progress", "done"]),
}) satisfies z.ZodType<TodoListItem>;

export const TodoListArtifactSchema = z.object({
  type: z.literal("todo_list"),
  items: z.array(TodoListItemSchema),
}) satisfies z.ZodType<TodoListArtifact>;

export const ToolStatusArtifactSchema = z.object({
  type: z.literal("tool_status"),
  name: z.string(),
  status: z.enum(["executing", "complete", "error"]),
  description: z.string(),
}) satisfies z.ZodType<ToolStatusArtifact>;

export const EChartsArtifactSchema = z.object({
  type: z.literal("echarts_widget"),
  title: z.string(),
  description: z.string(),
  option: z.record(z.unknown()),
  height: z.number().optional(),
}) satisfies z.ZodType<EChartsArtifact>;

export const MermaidArtifactSchema = z.object({
  type: z.literal("mermaid_diagram"),
  title: z.string(),
  definition: z.string(),
}) satisfies z.ZodType<MermaidArtifact>;

const Point2DSchema = z.object({ x: z.number(), y: z.number() });
const PhysicsRenderStyleSchema = z.object({
  fillStyle: z.string().optional(),
  strokeStyle: z.string().optional(),
  lineWidth: z.number().optional(),
});

const PhysicsBodySchema = z.object({
  id: z.string(),
  shape: z.enum(["circle", "rectangle", "polygon"]),
  x: z.number(),
  y: z.number(),
  radius: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  vertices: z.array(Point2DSchema).optional(),
  isStatic: z.boolean().optional(),
  density: z.number().optional(),
  friction: z.number().optional(),
  restitution: z.number().optional(),
  frictionAir: z.number().optional(),
  angle: z.number().optional(),
  velocity: Point2DSchema.optional(),
  label: z.string().optional(),
  render: PhysicsRenderStyleSchema.optional(),
}) satisfies z.ZodType<PhysicsBody>;

const PhysicsConstraintSchema = z.object({
  bodyAId: z.string(),
  bodyBId: z.string().nullable(),
  pointA: Point2DSchema.optional(),
  pointB: Point2DSchema.optional(),
  length: z.number().optional(),
  stiffness: z.number().optional(),
  damping: z.number().optional(),
  render: z.object({
    visible: z.boolean().optional(),
    strokeStyle: z.string().optional(),
    lineWidth: z.number().optional(),
  }).optional(),
}) satisfies z.ZodType<PhysicsConstraint>;

const PhysicsSceneSchema = z.object({
  gravity: Point2DSchema.optional(),
  walls: z.object({
    top: z.boolean().optional(),
    bottom: z.boolean().optional(),
    left: z.boolean().optional(),
    right: z.boolean().optional(),
  }).optional(),
  bodies: z.array(PhysicsBodySchema),
  constraints: z.array(PhysicsConstraintSchema).optional(),
  render: z.object({
    width: z.number(),
    height: z.number(),
    background: z.string().optional(),
  }),
  timeScale: z.number().optional(),
}) satisfies z.ZodType<PhysicsScene>;

export const PhysicsSceneArtifactSchema = z.object({
  type: z.literal("physics_scene"),
  title: z.string(),
  description: z.string(),
  scene: PhysicsSceneSchema,
}) satisfies z.ZodType<PhysicsSceneArtifact>;

const AlgorithmHighlightRoleSchema = z.enum([
  "comparing",
  "swapping",
  "pivot",
  "sorted",
  "current",
  "visited",
  "queued",
  "stacked",
  "path",
  "dependency",
  "result",
  "muted",
]);

const AlgorithmArrayStateSchema = z.object({
  values: z.array(z.union([z.number(), z.string()])),
  highlights: z.array(z.object({ index: z.number(), role: AlgorithmHighlightRoleSchema })).optional(),
  pointers: z.array(z.object({ index: z.number(), label: z.string() })).optional(),
  sortedIndices: z.array(z.number()).optional(),
}) satisfies z.ZodType<AlgorithmArrayState>;

const AlgorithmTreeStateSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    value: z.union([z.number(), z.string()]),
    parentId: z.string().nullable().optional(),
    left: z.string().nullable().optional(),
    right: z.string().nullable().optional(),
  })),
  highlights: z.array(z.object({ id: z.string(), role: AlgorithmHighlightRoleSchema })).optional(),
  traversalPath: z.array(z.string()).optional(),
}) satisfies z.ZodType<AlgorithmTreeState>;

const AlgorithmGraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  value: z.union([z.number(), z.string()]).optional(),
});

const AlgorithmGraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  directed: z.boolean().optional(),
  weight: z.number().optional(),
});

const AlgorithmGraphStateSchema = z.object({
  nodes: z.array(AlgorithmGraphNodeSchema),
  edges: z.array(AlgorithmGraphEdgeSchema),
  highlights: z.array(z.object({
    nodeId: z.string().optional(),
    edgeKey: z.string().optional(),
    role: AlgorithmHighlightRoleSchema,
  })).optional(),
  queue: z.array(z.string()).optional(),
  stack: z.array(z.string()).optional(),
  distances: z.array(z.object({ nodeId: z.string(), value: z.union([z.number(), z.string()]) })).optional(),
}) satisfies z.ZodType<AlgorithmGraphState>;

const AlgorithmTableStateSchema = z.object({
  data: z.array(z.array(z.union([z.number(), z.string(), z.null()]))),
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
  highlights: z.array(z.object({
    row: z.number(),
    col: z.number(),
    role: AlgorithmHighlightRoleSchema,
  })).optional(),
  formula: z.string().optional(),
}) satisfies z.ZodType<AlgorithmTableState>;

const AlgorithmStepSchema = z.object({
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
}) satisfies z.ZodType<AlgorithmStep>;

export const AlgorithmVisualizationArtifactSchema = z.object({
  type: z.literal("algorithm_visualization"),
  title: z.string(),
  description: z.string(),
  algorithm: z.string(),
  steps: z.array(AlgorithmStepSchema),
}) satisfies z.ZodType<AlgorithmVisualizationArtifact>;

const MathExplorerFunctionSchema = z.object({
  expr: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  dashed: z.boolean().optional(),
});

const MathExplorerCurveSchema = z.object({
  xExpr: z.string(),
  yExpr: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
});

const MathExplorerParameterSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  min: z.number(),
  max: z.number(),
  default: z.number(),
  step: z.number().optional(),
});

export const MathExplorerArtifactSchema = z.object({
  type: z.literal("math_explorer"),
  title: z.string(),
  description: z.string(),
  mode: z.enum(["cartesian", "parametric"]).optional(),
  functions: z.array(MathExplorerFunctionSchema).optional(),
  curves: z.array(MathExplorerCurveSchema).optional(),
  parameters: z.array(MathExplorerParameterSchema),
  xRange: z.tuple([z.number(), z.number()]).optional(),
  yRange: z.tuple([z.number(), z.number()]).optional(),
  tRange: z.tuple([z.number(), z.number()]).optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
}) satisfies z.ZodType<MathExplorerArtifact>;

const WaveComponentSchema = z.object({
  label: z.string().optional(),
  amplitude: z.number(),
  frequency: z.number(),
  phase: z.number().optional(),
  kind: z.enum(["sine", "square", "sawtooth", "triangle"]).optional(),
  color: z.string().optional(),
}) satisfies z.ZodType<WaveComponent>;

export const WaveVisualizationArtifactSchema = z.object({
  type: z.literal("wave_visualization"),
  title: z.string(),
  description: z.string(),
  waves: z.array(WaveComponentSchema),
  layout: z.enum(["superposition", "beat", "standing"]),
  timeScale: z.number().optional(),
  audioEnabled: z.boolean().optional(),
  audioFrequencies: z.array(z.number()).optional(),
}) satisfies z.ZodType<WaveVisualizationArtifact>;

const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  group: z.string().optional(),
  size: z.number().optional(),
  color: z.string().optional(),
}) satisfies z.ZodType<GraphNode>;

const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  weight: z.number().optional(),
  directed: z.boolean().optional(),
}) satisfies z.ZodType<GraphEdge>;

export const GraphVisualizationArtifactSchema = z.object({
  type: z.literal("graph_visualization"),
  title: z.string(),
  description: z.string(),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  directed: z.boolean().optional(),
  layout: z.enum(["force", "tree", "circle", "grid"]).optional(),
}) satisfies z.ZodType<GraphVisualizationArtifact>;

const MoleculeAtomSchema = z.object({
  id: z.string(),
  element: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  label: z.string().optional(),
  charge: z.number().optional(),
}) satisfies z.ZodType<MoleculeAtom>;

const MoleculeBondSchema = z.object({
  atomA: z.string(),
  atomB: z.string(),
  order: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
}) satisfies z.ZodType<MoleculeBond>;

export const MoleculeArtifactSchema = z.object({
  type: z.literal("molecule"),
  title: z.string(),
  description: z.string(),
  atoms: z.array(MoleculeAtomSchema),
  bonds: z.array(MoleculeBondSchema),
  representation: z.enum(["ball_stick", "stick", "sphere"]).optional(),
}) satisfies z.ZodType<MoleculeArtifact>;

export const TutorArtifactSchema = z.discriminatedUnion("type", [
  HtmlWidgetArtifactSchema,
  VisualizationPlanArtifactSchema,
  CodeArtifactSchema,
  CourseCardArtifactSchema,
  TodoListArtifactSchema,
  ToolStatusArtifactSchema,
  EChartsArtifactSchema,
  MermaidArtifactSchema,
  PhysicsSceneArtifactSchema,
  AlgorithmVisualizationArtifactSchema,
  MathExplorerArtifactSchema,
  WaveVisualizationArtifactSchema,
  GraphVisualizationArtifactSchema,
  MoleculeArtifactSchema,
]) satisfies z.ZodType<TutorArtifact>;

export function isTutorArtifact(value: unknown): value is TutorArtifact {
  return TutorArtifactSchema.safeParse(value).success;
}
