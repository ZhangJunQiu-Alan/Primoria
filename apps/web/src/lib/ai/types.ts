export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: Exclude<ChatRole, "system">;
  content: string;
};

export type TutorProviderSettings = {
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

export type HtmlWidgetArtifact = {
  type: "html_widget";
  title: string;
  description: string;
  html: string;
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

export type ToolStatusArtifact = {
  type: "tool_status";
  name: string;
  status: "executing" | "complete" | "error";
  description: string;
};

export type TutorArtifact = HtmlWidgetArtifact | VisualizationPlanArtifact | CodeArtifact | ToolStatusArtifact;

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
      artifact: HtmlWidgetArtifact;
    }
  | {
      type: "final";
      result: TutorAgentResponse;
    }
  | {
      type: "error";
      reply: string;
    };
