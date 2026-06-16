import type { AgentAskUserRequest, AgentEvent } from "@primoria/contracts/agent";
import { AgentAskUserRequestSchema, AgentEventSchema } from "../../../../../packages/contracts/src/agent/index";

export type AgentAskUserResumePayload = {
  questionId?: string;
  resumeToken: string;
  answer: string;
  optionValue?: string;
};

export function createAgentAskUserRequest(input: AgentAskUserRequest): AgentAskUserRequest {
  return AgentAskUserRequestSchema.parse(input);
}

export function createAgentAskUserEvent(input: {
  runId: string;
  workspaceId?: string;
  threadId?: string;
  createdAt?: number;
  question: AgentAskUserRequest;
}): AgentEvent {
  return AgentEventSchema.parse({
    type: "ask_user.requested",
    runId: input.runId,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    createdAt: input.createdAt,
    question: createAgentAskUserRequest(input.question),
  });
}

export function createAgentAskUserResumePayload(input: AgentAskUserResumePayload): AgentAskUserResumePayload {
  return {
    questionId: input.questionId,
    resumeToken: input.resumeToken,
    answer: input.answer,
    optionValue: input.optionValue,
  };
}
