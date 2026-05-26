export type ChatRole = "user" | "assistant" | "system";

export type MessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

export type ChatMessage = {
  role: Exclude<ChatRole, "system">;
  content: string | MessageContentPart[];
};

export type AttachmentKind = "image" | "document";

export type AttachmentMetadata = {
  id: string;
  name: string;
  type: AttachmentKind;
  mimeType: string;
  size: number;
};

export type ChatAttachment = AttachmentMetadata & {
  base64Text: string;
};

export type TutorProviderSettings = {
  provider?: "openai-compatible" | "anthropic-compatible";
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

export type TutorAgentLabel =
  | "Tutor team"
  | "Concept agent"
  | "Visualization agent"
  | "Practice agent"
  | "Code agent"
  | "Course agent";

export type WidgetDependency = {
  url: string;
  global?: string;
  kind?: "script" | "module" | "style";
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
  outline: Array<{
    type: "text" | "analogy" | "transfer" | "visual" | "code";
    title: string;
  }>;
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

export type QuizQuestion =
  | {
      kind: "multiple_choice";
      question: string;
      options: string[];
      correct: number;
      explanation?: string;
    }
  | {
      kind: "multi_select";
      question: string;
      options: string[];
      correct: number[];
      explanation?: string;
    }
  | {
      kind: "fill_blank";
      question: string;
      answer: string;
      alternates?: string[];
      explanation?: string;
    }
  | {
      kind: "matching";
      question: string;
      pairs: Array<{ left: string; right: string }>;
      explanation?: string;
    };

export type QuizArtifact = {
  type: "quiz";
  title: string;
  description?: string;
  questions: QuizQuestion[];
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
  | MoleculeArtifact
  | QuizArtifact;

export type TutorAgentResponse = {
  label: TutorAgentLabel;
  reply: string;
  artifacts: TutorArtifact[];
  suggestions: string[];
};

export type TutorStreamEvent =
  | {
      type: "assistant_message";
      label: TutorAgentLabel;
      reply: string;
      suggestions: string[];
    }
  | {
      type: "tool_status";
      artifact: ToolStatusArtifact;
    }
  | {
      type: "artifact";
      artifact: TutorArtifact;
    }
  | {
      type: "artifact_delta";
      artifact: HtmlWidgetArtifact | TodoListArtifact;
    }
  | {
      type: "final";
      result: TutorAgentResponse;
    }
  | {
      type: "error";
      reply: string;
    };
