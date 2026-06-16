import type { AgentEvent, AgentSignal } from "@primoria/contracts/agent";
import {
  workspaceAgentEventsToAgentSignals,
  workspaceRuntimeEventToAgentEvent,
  workspaceRuntimeResultToTerminalAgentEvent,
} from "../agent-os/events";
import type { WorkspaceAgentRuntimeEvent } from "./agent-runtime";
import type { WorkspaceAgentMemory, WorkspaceAgentRun, WorkspaceAgentRunEvent, WorkspaceTask } from "./types";

export type WorkspaceAgentEventView = {
  agentEvents: AgentEvent[];
  agentSignals: AgentSignal[];
};

export function buildWorkspaceAgentEventView(run: WorkspaceAgentRun, events: WorkspaceAgentRunEvent[]): WorkspaceAgentEventView {
  const runEvents = events
    .filter((event) => event.runId === run.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  const agentEvents = [
    ...runEvents.map((event) =>
      workspaceRuntimeEventToAgentEvent(workspaceRunEventToRuntimeEvent(event), {
        runId: run.id,
        workspaceId: run.workspaceId,
        threadId: run.threadId,
        createdAt: event.createdAt,
      }),
    ),
    buildRunStatusAgentEvent(run),
  ];
  return {
    agentEvents,
    agentSignals: workspaceAgentEventsToAgentSignals(agentEvents),
  };
}

export function buildWorkspaceAgentPageEventView(runs: WorkspaceAgentRun[], events: WorkspaceAgentRunEvent[]): WorkspaceAgentEventView {
  const agentEvents = runs.flatMap((run) => buildWorkspaceAgentEventView(run, events).agentEvents).sort(compareAgentEvents);
  return {
    agentEvents,
    agentSignals: workspaceAgentEventsToAgentSignals(agentEvents),
  };
}

export function buildWorkspaceAgentRunResultEventView(input: {
  runs: WorkspaceAgentRun[];
  events: WorkspaceAgentRunEvent[];
  memories?: WorkspaceAgentMemory[];
  task?: WorkspaceTask;
}): WorkspaceAgentEventView {
  const view = buildWorkspaceAgentPageEventView(input.runs, input.events);
  const memoryEvents = (input.memories ?? []).flatMap((memory) => {
    const runId = memory.sourceRunId;
    if (!runId) return [];
    const run = input.runs.find((entry) => entry.id === runId);
    if (!run) return [];
    return [
      {
        type: "memory.saved",
        runId,
        workspaceId: run.workspaceId,
        threadId: run.threadId,
        createdAt: memory.createdAt,
        memory,
      } satisfies AgentEvent,
    ];
  });
  const taskEvents = input.task
    ? input.runs
        .filter((run) => run.taskId === input.task?.id)
        .map(
          (run) =>
            ({
              type: "task.updated",
              runId: run.id,
              workspaceId: run.workspaceId,
              threadId: run.threadId,
              createdAt: input.task?.updatedAt,
              task: input.task,
            }) satisfies AgentEvent,
        )
    : [];
  const agentEvents = [...view.agentEvents, ...memoryEvents, ...taskEvents].sort(compareAgentEvents);
  return {
    agentEvents,
    agentSignals: workspaceAgentEventsToAgentSignals(agentEvents),
  };
}

function workspaceRunEventToRuntimeEvent(event: WorkspaceAgentRunEvent): WorkspaceAgentRuntimeEvent & { createdAt: number } {
  return {
    type: event.type,
    label: event.label,
    payload: event.payload,
    createdAt: event.createdAt,
  };
}

function buildRunStatusAgentEvent(run: WorkspaceAgentRun): AgentEvent {
  if (run.status === "running") {
    return {
      type: "runtime.started",
      runId: run.id,
      workspaceId: run.workspaceId,
      threadId: run.threadId,
      createdAt: run.startedAt,
      payload: { status: run.status },
    };
  }
  if (run.status === "queued") {
    return {
      type: "runtime.step",
      runId: run.id,
      workspaceId: run.workspaceId,
      threadId: run.threadId,
      createdAt: run.startedAt,
      label: "queued",
      payload: { status: run.status },
    };
  }
  return workspaceRuntimeResultToTerminalAgentEvent({
    runId: run.id,
    workspaceId: run.workspaceId,
    threadId: run.threadId,
    status: run.status,
    error: run.error,
    createdAt: run.completedAt ?? run.startedAt,
  });
}

function compareAgentEvents(a: AgentEvent, b: AgentEvent) {
  return (a.createdAt ?? 0) - (b.createdAt ?? 0);
}
