import { invokePrimoriaDeepAgent, invokePrimoriaDeepAgentStream } from "./deepagent/primoria-deep-agent";
import type { ChatMessage, TutorAgentResponse, TutorProviderSettings, TutorStreamEvent } from "./types";

export async function runTutorAgent(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
): Promise<TutorAgentResponse> {
  return invokePrimoriaDeepAgent(messages, settings);
}

export async function runTutorAgentStream(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  emit: (event: TutorStreamEvent) => void,
): Promise<TutorAgentResponse> {
  const response = await invokePrimoriaDeepAgentStream(messages, settings, emit);
  emit({ type: "final", result: response });
  return response;
}
