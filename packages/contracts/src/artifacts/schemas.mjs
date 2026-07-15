// Cross-runtime Zod schemas shared by the LangGraph agent (plain ESM) and the
// web app. This file is the single runtime source of truth for tool-argument
// and artifact-payload shapes; hand-written types live in schemas.d.mts and
// artifact-level types/schemas compose these in ./index.ts.
//
// Descriptions and numeric constraints here are model-facing: they become the
// JSON schema the LLM sees, so do not weaken them casually.
import { z } from "zod";

// ── Widgets ─────────────────────────────────────────────────────────────────

export const WidgetDependencySchema = z.object({
  url: z.string(),
  global: z.string().optional(),
  kind: z.enum(["script", "module", "style"]).optional(),
});

export const PlanVisualizationArgsSchema = z.object({
  title: z.string().optional(),
  approach: z.string(),
  technology: z.string(),
  key_elements: z.union([z.array(z.string()), z.string()]),
  subject: z.enum(["physics", "math", "cs"]).optional(),
});

export const WidgetRendererArgsSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  html: z.string(),
  dependencies: z.array(WidgetDependencySchema).optional(),
});

export const StemRendererArgsSchema = z.object({
  subject: z.enum(["physics", "math", "cs"]),
  scene: z.string().describe("Scene type, e.g. 'pendulum', 'spring', 'bubble-sort'"),
  title: z.string().describe("Short title for the simulation"),
  description: z.string().describe("One-sentence description of what this demonstrates"),
  code: z.string().describe(
    "JavaScript code calling the subject Runtime API (Physics / MathGL / AlgoViz). No imports. No document/window DOM calls. Call run() last."
  ),
});

export const Render3dSceneArgsSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  html: z.string(),
});

// ── Chat quiz ───────────────────────────────────────────────────────────────

export const ChatQuizChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const ChatQuizQuestionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single"),
    id: z.string(),
    question: z.string(),
    choices: z.array(ChatQuizChoiceSchema).min(2).max(6),
    correctId: z.string(),
    explanation: z.string().optional(),
  }),
  z.object({
    kind: z.literal("multi"),
    id: z.string(),
    question: z.string(),
    choices: z.array(ChatQuizChoiceSchema).min(2).max(6),
    correctIds: z.array(z.string()).min(1),
    explanation: z.string().optional(),
  }),
  z.object({
    kind: z.literal("truefalse"),
    id: z.string(),
    question: z.string(),
    correct: z.boolean(),
    explanation: z.string().optional(),
  }),
]);

export const RenderChatQuizArgsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  questions: z.array(ChatQuizQuestionSchema).min(1).max(6),
});

// ── Course ──────────────────────────────────────────────────────────────────

export const PositionLearningGoalArgsSchema = z.object({
  query: z.string(),
  graph_id: z.string().optional(),
});

export const GetCourseCardArgsSchema = z.object({
  course_id: z.string(),
});

// ── Interactive components ──────────────────────────────────────────────────

// Stage-1 routing happens as the tutor LLM's tool choice: picking this tool
// with a component_id IS the catalog selection. Stage-2 (config generation)
// runs web-side with the learner's session; the tool result is a stateless
// signal, mirroring position_learning_goal.
export const OpenInteractiveComponentArgsSchema = z.object({
  component_id: z
    .string()
    .describe("Catalog componentId, e.g. physics.lens-imaging. Must be one of the ids listed in the system prompt catalog."),
  request: z
    .string()
    .min(1)
    .max(2000)
    .describe("The learner's visualization request or adjustment, verbatim, in the learner's language."),
});

// ── ECharts / Mermaid ───────────────────────────────────────────────────────

export const RenderChartArgsSchema = z.object({
  title: z.string().describe("Display title for the chart card header"),
  description: z.string().describe("One sentence describing what this chart shows"),
  option: z.record(z.unknown()).describe("Complete ECharts option JSON object"),
  height: z.number().optional().describe("Canvas height in px, default 400"),
});

export const RenderDiagramArgsSchema = z.object({
  title: z.string().describe("Display title for the diagram card header"),
  definition: z.string().describe("Complete Mermaid diagram definition string"),
});

// ── Physics scene ───────────────────────────────────────────────────────────

const Point2DSchema = z.object({ x: z.number(), y: z.number() });

export const PhysicsBodySchema = z.object({
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
  render: z.object({
    fillStyle: z.string().optional(),
    strokeStyle: z.string().optional(),
    lineWidth: z.number().optional(),
  }).optional(),
});

export const PhysicsConstraintSchema = z.object({
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
});

export const PhysicsSceneSchema = z.object({
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
});

export const RenderPhysicsSceneArgsSchema = z.object({
  title: z.string().describe("Display title"),
  description: z.string().describe("One sentence describing the physics concept"),
  scene: PhysicsSceneSchema,
});

// ── Algorithm visualization ─────────────────────────────────────────────────

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

export const AlgorithmStepSchema = z.object({
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

export const RenderAlgorithmArgsSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  algorithm: z.string().describe("e.g. 'bubble_sort', 'bfs', 'binary_tree_inorder', 'knapsack_dp'"),
  steps: z.array(AlgorithmStepSchema).min(1).max(60),
});

// ── Math explorer ───────────────────────────────────────────────────────────

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

// Tool-input ranges arrive as plain 2-element arrays (models emit arrays, not
// tuples); the agent normalizes them to [number, number] before the artifact.
export const MathExplorerRangeInputSchema = z.array(z.number()).min(2).max(2);

export const RenderMathExplorerArgsSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  mode: z.enum(["cartesian", "parametric"]).optional(),
  functions: z.array(MathExplorerFunctionSchema).optional(),
  curves: z.array(MathExplorerCurveSchema).optional(),
  parameters: z.array(MathExplorerParameterSchema).max(6),
  xRange: MathExplorerRangeInputSchema.optional(),
  yRange: MathExplorerRangeInputSchema.optional(),
  tRange: MathExplorerRangeInputSchema.optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
});

// ── Waves ───────────────────────────────────────────────────────────────────

export const WaveComponentSchema = z.object({
  label: z.string().optional(),
  amplitude: z.number().min(0).max(1),
  frequency: z.number().positive(),
  phase: z.number().optional(),
  kind: z.enum(["sine", "square", "sawtooth", "triangle"]).optional(),
  color: z.string().optional(),
});

export const RenderWaveArgsSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  waves: z.array(WaveComponentSchema).min(1).max(6),
  layout: z.enum(["superposition", "beat", "standing"]).optional(),
  timeScale: z.number().positive().optional().describe("Number of slowest-wave cycles to show. Default 3."),
  audioEnabled: z.boolean().optional(),
  audioFrequencies: z.array(z.number().positive()).optional().describe("Per-wave audio frequencies in Hz. Overrides wave.frequency for sound only."),
});

// ── Force-directed graph ────────────────────────────────────────────────────

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  group: z.string().optional(),
  size: z.number().min(0.5).max(3).optional(),
  color: z.string().optional(),
});

export const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  weight: z.number().optional(),
  directed: z.boolean().optional(),
});

export const RenderGraphArgsSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  nodes: z.array(GraphNodeSchema).min(2).max(60),
  edges: z.array(GraphEdgeSchema).max(120),
  directed: z.boolean().optional(),
  layout: z.enum(["force", "tree", "circle", "grid"]).optional(),
});

// ── Molecule ────────────────────────────────────────────────────────────────

export const MoleculeAtomSchema = z.object({
  id: z.string(),
  element: z.string().describe("Chemical symbol e.g. H, C, O, N, P, S, Cl, Br, Fe, etc."),
  x: z.number().describe("X coordinate in Angstroms"),
  y: z.number().describe("Y coordinate in Angstroms"),
  z: z.number().describe("Z coordinate in Angstroms"),
  label: z.string().optional(),
  charge: z.number().int().optional().describe("Formal charge e.g. +1, -1"),
});

export const MoleculeBondSchema = z.object({
  atomA: z.string().describe("ID of first atom"),
  atomB: z.string().describe("ID of second atom"),
  order: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()
    .describe("Bond order: 1=single, 2=double, 3=triple"),
});

export const RenderMoleculeArgsSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  atoms: z.array(MoleculeAtomSchema).min(1).max(200),
  bonds: z.array(MoleculeBondSchema).max(300),
  representation: z.enum(["ball_stick", "stick", "sphere"]).optional(),
});
