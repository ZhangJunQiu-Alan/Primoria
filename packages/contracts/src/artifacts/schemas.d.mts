// Hand-written declarations for schemas.mjs (same pattern as visual-style.d.ts).
// There is no compiler check between the two files; the contract test in
// apps/web/tests/contracts-artifact-schemas.spec.ts guards drift.
import type { z } from "zod";

// ── Payload types (single source; ./index.ts re-exports these) ──────────────

export type WidgetDependencyKind = "script" | "module" | "style";

export type WidgetDependency = {
  url: string;
  global?: string;
  kind?: WidgetDependencyKind;
};

export type ChatQuizChoice = { id: string; text: string };

export type ChatQuizQuestion =
  | { kind: "single"; id: string; question: string; choices: ChatQuizChoice[]; correctId: string; explanation?: string }
  | { kind: "multi"; id: string; question: string; choices: ChatQuizChoice[]; correctIds: string[]; explanation?: string }
  | { kind: "truefalse"; id: string; question: string; correct: boolean; explanation?: string };

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

export type WaveComponent = {
  label?: string;
  amplitude: number;
  frequency: number;
  phase?: number;
  kind?: "sine" | "square" | "sawtooth" | "triangle";
  color?: string;
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

// ── Tool-argument types ─────────────────────────────────────────────────────

export type PlanVisualizationArgs = {
  title?: string;
  approach: string;
  technology: string;
  key_elements: string[] | string;
  subject?: "physics" | "math" | "cs";
};

export type WidgetRendererArgs = {
  title?: string;
  description: string;
  html: string;
  dependencies?: WidgetDependency[];
};

export type StemRendererArgs = {
  subject: "physics" | "math" | "cs";
  scene: string;
  title: string;
  description: string;
  code: string;
};

export type Render3dSceneArgs = { title?: string; description: string; html: string };

export type RenderChatQuizArgs = {
  title?: string;
  description?: string;
  questions: ChatQuizQuestion[];
};

export type PositionLearningGoalArgs = { query: string; graph_id?: string };
export type GetCourseCardArgs = { course_id: string };

export type RenderChartArgs = {
  title: string;
  description: string;
  option: Record<string, unknown>;
  height?: number;
};

export type RenderDiagramArgs = { title: string; definition: string };

export type RenderPhysicsSceneArgs = { title: string; description: string; scene: PhysicsScene };

export type RenderAlgorithmArgs = {
  title?: string;
  description: string;
  algorithm: string;
  steps: AlgorithmStep[];
};

export type RenderMathExplorerArgs = {
  title?: string;
  description: string;
  mode?: "cartesian" | "parametric";
  functions?: MathExplorerFunction[];
  curves?: MathExplorerCurve[];
  parameters: MathExplorerParameter[];
  xRange?: number[];
  yRange?: number[];
  tRange?: number[];
  xLabel?: string;
  yLabel?: string;
};

export type RenderWaveArgs = {
  title?: string;
  description: string;
  waves: WaveComponent[];
  layout?: "superposition" | "beat" | "standing";
  timeScale?: number;
  audioEnabled?: boolean;
  audioFrequencies?: number[];
};

export type RenderGraphArgs = {
  title?: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean;
  layout?: "force" | "tree" | "circle" | "grid";
};

export type RenderMoleculeArgs = {
  title?: string;
  description: string;
  atoms: MoleculeAtom[];
  bonds: MoleculeBond[];
  representation?: "ball_stick" | "stick" | "sphere";
};

// ── Schema declarations ─────────────────────────────────────────────────────

export declare const WidgetDependencySchema: z.ZodType<WidgetDependency>;
export declare const PlanVisualizationArgsSchema: z.ZodType<PlanVisualizationArgs>;
export declare const WidgetRendererArgsSchema: z.ZodType<WidgetRendererArgs>;
export declare const StemRendererArgsSchema: z.ZodType<StemRendererArgs>;
export declare const Render3dSceneArgsSchema: z.ZodType<Render3dSceneArgs>;

export declare const ChatQuizChoiceSchema: z.ZodType<ChatQuizChoice>;
export declare const ChatQuizQuestionSchema: z.ZodType<ChatQuizQuestion>;
export declare const RenderChatQuizArgsSchema: z.ZodType<RenderChatQuizArgs>;

export declare const PositionLearningGoalArgsSchema: z.ZodType<PositionLearningGoalArgs>;
export declare const GetCourseCardArgsSchema: z.ZodType<GetCourseCardArgs>;

export declare const RenderChartArgsSchema: z.ZodType<RenderChartArgs>;
export declare const RenderDiagramArgsSchema: z.ZodType<RenderDiagramArgs>;

export declare const PhysicsBodySchema: z.ZodType<PhysicsBody>;
export declare const PhysicsConstraintSchema: z.ZodType<PhysicsConstraint>;
export declare const PhysicsSceneSchema: z.ZodType<PhysicsScene>;
export declare const RenderPhysicsSceneArgsSchema: z.ZodType<RenderPhysicsSceneArgs>;

export declare const AlgorithmHighlightRoleSchema: z.ZodType<AlgorithmHighlightRole>;
export declare const AlgorithmArrayStateSchema: z.ZodType<AlgorithmArrayState>;
export declare const AlgorithmTreeStateSchema: z.ZodType<AlgorithmTreeState>;
export declare const AlgorithmGraphStateSchema: z.ZodType<AlgorithmGraphState>;
export declare const AlgorithmTableStateSchema: z.ZodType<AlgorithmTableState>;
export declare const AlgorithmStepSchema: z.ZodType<AlgorithmStep>;
export declare const RenderAlgorithmArgsSchema: z.ZodType<RenderAlgorithmArgs>;

export declare const MathExplorerFunctionSchema: z.ZodType<MathExplorerFunction>;
export declare const MathExplorerCurveSchema: z.ZodType<MathExplorerCurve>;
export declare const MathExplorerParameterSchema: z.ZodType<MathExplorerParameter>;
export declare const MathExplorerRangeInputSchema: z.ZodType<number[]>;
export declare const RenderMathExplorerArgsSchema: z.ZodType<RenderMathExplorerArgs>;

export declare const WaveComponentSchema: z.ZodType<WaveComponent>;
export declare const RenderWaveArgsSchema: z.ZodType<RenderWaveArgs>;

export declare const GraphNodeSchema: z.ZodType<GraphNode>;
export declare const GraphEdgeSchema: z.ZodType<GraphEdge>;
export declare const RenderGraphArgsSchema: z.ZodType<RenderGraphArgs>;

export declare const MoleculeAtomSchema: z.ZodType<MoleculeAtom>;
export declare const MoleculeBondSchema: z.ZodType<MoleculeBond>;
export declare const RenderMoleculeArgsSchema: z.ZodType<RenderMoleculeArgs>;
