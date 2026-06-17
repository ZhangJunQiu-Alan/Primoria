import type { HtmlWidgetArtifact, TodoListArtifact, ToolStatusArtifact, TutorArtifact } from "../artifacts";
import type { TutorAgentLabel } from "../chat";

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
