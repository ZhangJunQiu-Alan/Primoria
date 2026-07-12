import { z } from "zod";
import {
  AlgorithmStepSchema,
  GraphEdgeSchema,
  GraphNodeSchema,
  MathExplorerCurveSchema,
  MathExplorerFunctionSchema,
  MathExplorerParameterSchema,
  MoleculeAtomSchema,
  MoleculeBondSchema,
  PhysicsSceneSchema,
  WaveComponentSchema,
  WidgetDependencySchema,
} from "./schemas.mjs";
import type {
  AlgorithmStep,
  GraphEdge,
  GraphNode,
  MathExplorerCurve,
  MathExplorerFunction,
  MathExplorerParameter,
  MoleculeAtom,
  MoleculeBond,
  PhysicsScene,
  WaveComponent,
  WidgetDependency,
} from "./schemas.mjs";

// Shared payload types and Zod schemas (runtime lives in schemas.mjs so the
// plain-ESM agent can import them too). Re-exported here so web code keeps a
// single import surface.
export * from "./schemas.mjs";

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

export type PhysicsSceneArtifact = {
  type: "physics_scene";
  title: string;
  description: string;
  scene: PhysicsScene;
};

export type AlgorithmVisualizationArtifact = {
  type: "algorithm_visualization";
  title: string;
  description: string;
  algorithm: string;
  steps: AlgorithmStep[];
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

export const PhysicsSceneArtifactSchema = z.object({
  type: z.literal("physics_scene"),
  title: z.string(),
  description: z.string(),
  scene: PhysicsSceneSchema,
}) satisfies z.ZodType<PhysicsSceneArtifact>;

export const AlgorithmVisualizationArtifactSchema = z.object({
  type: z.literal("algorithm_visualization"),
  title: z.string(),
  description: z.string(),
  algorithm: z.string(),
  steps: z.array(AlgorithmStepSchema),
}) satisfies z.ZodType<AlgorithmVisualizationArtifact>;

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

export const GraphVisualizationArtifactSchema = z.object({
  type: z.literal("graph_visualization"),
  title: z.string(),
  description: z.string(),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  directed: z.boolean().optional(),
  layout: z.enum(["force", "tree", "circle", "grid"]).optional(),
}) satisfies z.ZodType<GraphVisualizationArtifact>;

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
