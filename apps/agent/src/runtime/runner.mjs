import { randomUUID } from "node:crypto";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { EventType } from "@ag-ui/core";
import { createAguiEventMapper } from "./agui-events.mjs";

/** @param {number} ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {unknown} content */
function contentToText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => typeof part === "string" ? part : String(part?.text ?? "")).join("\n");
}

/** @param {unknown} value */
function parseArgs(value) {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(String(value ?? "{}"));
  } catch {
    return {};
  }
}

/** @param {any[]} [messages] */
export function toLangChainMessages(messages = []) {
  /** @type {any[]} */
  const converted = [];
  for (const message of messages) {
    const id = message.id;
    if (message.role === "user") converted.push(new HumanMessage({ id, content: contentToText(message.content) }));
    if (message.role === "system" || message.role === "developer") {
      converted.push(new SystemMessage({ id, content: contentToText(message.content) }));
    }
    if (message.role === "assistant") {
      converted.push(new AIMessage({
        id,
        content: contentToText(message.content),
        tool_calls: (message.toolCalls ?? []).map((/** @type {any} */ call) => ({
          id: call.id,
          name: call.function.name,
          args: parseArgs(call.function.arguments),
          type: "tool_call",
        })),
      }));
    }
    if (message.role === "tool") {
      converted.push(new ToolMessage({
        id,
        content: contentToText(message.content),
        tool_call_id: message.toolCallId,
      }));
    }
  }
  return converted;
}

/** @param {any} input */
function runtimeContext(input) {
  return {
    primoria_owner_id: input?.state?.primoria_owner_id,
    user_id: input?.state?.user_id,
    copilotkit: input?.state?.copilotkit,
  };
}

/** @param {any} error */
function retryableError(error) {
  const status = Number(error?.status ?? error?.response?.status ?? 0);
  if ([408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const code = String(error?.code ?? "").toLowerCase();
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return ["timeout", "timed out", "econnreset", "econnrefused", "fetch failed", "rate limit", "temporarily unavailable"]
    .some((token) => code.includes(token) || message.includes(token));
}

/** @param {{ store: any, graph: any, concurrency?: number, leaseMs?: number, pollMs?: number }} options */
export function createRunWorker({ store, graph, concurrency = 2, leaseMs = 30_000, pollMs = 250 }) {
  const workerId = `agent_${process.pid}_${randomUUID()}`;
  const controllers = new Map();
  /** @type {Promise<void>[]} */
  const loops = [];
  let stopping = false;

  /** @param {any} run */
  async function execute(run) {
    const controller = new AbortController();
    controllers.set(run.id, controller);
    const input = run.input;
    const leaseToken = run.lease_token;
    /** @param {Record<string, any>} event */
    const emit = (event) => store.appendEvent(run.id, leaseToken, event);
    const mapEvent = createAguiEventMapper(emit);
    let heartbeat;
    try {
      const existing = await store.listEvents(run.id, 0);
      if (!existing.some((/** @type {any} */ row) => row.event?.type === EventType.RUN_STARTED)) {
        await emit({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId });
      }

      heartbeat = setInterval(async () => {
        try {
          const result = await store.heartbeat(run.id, leaseToken, leaseMs);
          if (!result.active || result.cancelRequested) controller.abort(result.cancelRequested ? "cancelled" : "lease_lost");
        } catch (error) {
          console.error("[agent-runtime] heartbeat failed", { runId: run.id, error });
          controller.abort("heartbeat_failed");
        }
      }, Math.max(1_000, Math.floor(leaseMs / 3)));

      const forwardedConfig = input?.forwardedProps?.config ?? {};
      const config = {
        ...forwardedConfig,
        configurable: {
          ...(forwardedConfig.configurable ?? {}),
          thread_id: run.id,
        },
        metadata: {
          ...(forwardedConfig.metadata ?? {}),
          primoria_run_id: run.id,
        },
        context: runtimeContext(input),
        signal: controller.signal,
        version: "v2",
      };
      const state = {
        ...(input.state ?? {}),
        messages: toLangChainMessages(input.messages),
      };

      for await (const event of graph.streamEvents(state, config)) {
        if (controller.signal.aborted) throw new DOMException("Agent run aborted", "AbortError");
        await mapEvent(event);
      }

      await store.finish(run.id, leaseToken, {
        type: EventType.RUN_FINISHED,
        threadId: input.threadId,
        runId: input.runId,
      });
    } catch (error) {
      const abortReason = controller.signal.aborted ? String(controller.signal.reason) : null;
      if (abortReason === "cancelled") {
        await store.markCancelled(run.id, leaseToken);
      } else if (abortReason === "shutdown") {
        // Leave the lease intact. The next process applies the stale-run rule:
        // retry only if no user-visible/tool output was persisted.
      } else {
        const outcome = await store.fail(run.id, leaseToken, error, retryableError(error));
        console.error("[agent-runtime] run failed", {
          runId: run.id,
          outcome,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      controllers.delete(run.id);
    }
  }

  async function loop() {
    while (!stopping) {
      const run = await store.claimNext(workerId, leaseMs);
      if (!run) {
        await delay(pollMs);
        continue;
      }
      await execute(run);
    }
  }

  return {
    async start() {
      await store.recoverStaleRuns();
      for (let index = 0; index < concurrency; index += 1) loops.push(loop());
    },

    async stop(graceMs = 30_000) {
      stopping = true;
      const drained = Promise.allSettled(loops);
      const timeout = delay(graceMs).then(() => "timeout");
      if (await Promise.race([drained, timeout]) === "timeout") {
        for (const controller of controllers.values()) controller.abort("shutdown");
        await Promise.race([drained, delay(5_000)]);
      }
    },

    activeCount() {
      return controllers.size;
    },
  };
}
