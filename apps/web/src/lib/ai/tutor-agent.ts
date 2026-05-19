import { invokePrimoriaDeepAgent, invokePrimoriaDeepAgentStream } from "./deepagent/primoria-deep-agent";
import type { ChatMessage, ToolStatusArtifact, TutorAgentResponse, TutorProviderSettings, TutorStreamEvent } from "./types";

function toolStatus(
  name: ToolStatusArtifact["name"],
  status: ToolStatusArtifact["status"],
  description: string,
): ToolStatusArtifact {
  return {
    type: "tool_status",
    name,
    status,
    description,
  };
}

export async function runTutorAgent(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
): Promise<TutorAgentResponse> {
  const result = await invokePrimoriaDeepAgent(messages, settings);

  return {
    label: result.label,
    reply: result.reply,
    artifacts: result.artifacts,
    suggestions: result.suggestions,
  };
}

export async function runTutorAgentStream(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  emit: (event: TutorStreamEvent) => void,
): Promise<TutorAgentResponse> {
  emit({
    type: "tool_status",
    artifact: toolStatus("deep_agent", "executing", "Planning with DeepAgent and routing to the right tutor specialist."),
  });

  const result = await invokePrimoriaDeepAgentStream(messages, settings, emit);

  emit({
    type: "tool_status",
    artifact: toolStatus("deep_agent", "complete", "DeepAgent completed the tutor response."),
  });

  emit({
    type: "assistant_message",
    label: result.label,
    reply: result.reply,
    suggestions: result.suggestions,
  });

  const response: TutorAgentResponse = {
    label: result.label,
    reply: result.reply,
    artifacts: result.artifacts,
    suggestions: result.suggestions,
  };
  emit({ type: "final", result: response });
  return response;
}
