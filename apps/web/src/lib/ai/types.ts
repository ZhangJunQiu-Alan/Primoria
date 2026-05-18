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

export type CodeArtifact = {
  type: "code";
  title: string;
  language: string;
  code: string;
};

export type TutorArtifact = HtmlWidgetArtifact | CodeArtifact;

export type TutorAgentResponse = {
  label: TutorAgentLabel;
  reply: string;
  artifacts: TutorArtifact[];
  suggestions: string[];
};
