export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: Exclude<ChatRole, "system">;
  content: string;
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

export type TutorArtifact =
  | HtmlWidgetArtifact
  | VisualizationPlanArtifact
  | CodeArtifact
  | CourseCardArtifact
  | TodoListArtifact
  | ToolStatusArtifact;

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
